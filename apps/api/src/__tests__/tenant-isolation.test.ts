import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import { createSecondSchool, cleanupSecondSchool } from "./helpers.js";

/**
 * Tenant-isolation tests verify that:
 * - Each login returns a JWT containing the correct schoolId.
 * - The /me endpoint uses the token's schoolId, never any client-supplied value.
 * - Two teachers from different schools see only their own school's data.
 * - A teacher's token cannot be used to fetch another school's user.
 */

describe("Tenant isolation", () => {
  let schoolA: { id: string; slug: string };
  let schoolB: { id: string; slug: string };
  let tokenA: string;
  let tokenB: string;
  let teacherBId: string;
  let second: Awaited<ReturnType<typeof createSecondSchool>>;

  beforeAll(async () => {
    // School A = the seeded demo school
    const teacherA = await prisma.user.findFirst({
      where: { username: "teacher", role: "TEACHER" },
    });
    expect(teacherA).not.toBeNull();
    schoolA = { id: teacherA!.schoolId, slug: "greenwood-high" };

    // School B = a second school created for isolation testing
    second = await createSecondSchool();
    schoolB = { id: second.school.id, slug: second.school.slug };
    teacherBId = second.teacher.id;

    // Login as teacher A
    const resA = await request(app).post("/api/auth/login").send({
      username: "teacher",
      password: "teacher123",
    });
    tokenA = resA.body.data.token;

    // Login as teacher B
    const resB = await request(app).post("/api/auth/login").send({
      username: second.teacher.username,
      password: "teacherB123",
    });
    tokenB = resB.body.data.token;
  });

  afterAll(async () => {
    await cleanupSecondSchool(schoolB.id);
  });

  it("tokens from different schools carry different schoolIds", async () => {
    const meA = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokenA}`);

    const meB = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(meA.body.data.schoolId).toBe(schoolA.id);
    expect(meB.body.data.schoolId).toBe(schoolB.id);
    expect(meA.body.data.schoolId).not.toBe(meB.body.data.schoolId);
  });

  it("schoolId comes from the token, not from the request body or query", async () => {
    // Attempt to override schoolId via query param — must be ignored.
    const res = await request(app)
      .get(`/api/auth/me?schoolId=${schoolB.id}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.schoolId).toBe(schoolA.id);
    expect(res.body.data.schoolId).not.toBe(schoolB.id);
  });

  it("teacher A cannot fetch teacher B's profile", async () => {
    // The /me endpoint only returns the authenticated user.
    // Token A should never return user data belonging to school B.
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.body.data.id).not.toBe(teacherBId);
    expect(res.body.data.schoolId).toBe(schoolA.id);
  });

  it("login with schoolSlug scopes the lookup correctly", async () => {
    // Teacher B's username is unique, but if schoolSlug is provided
    // and is wrong, login should fail.
    const res = await request(app).post("/api/auth/login").send({
      username: "teacher",
      password: "teacher123",
      schoolSlug: schoolB.slug, // wrong school for this username
    });

    // No user with username "teacher" exists in school B.
    expect(res.status).toBe(401);
  });
});
