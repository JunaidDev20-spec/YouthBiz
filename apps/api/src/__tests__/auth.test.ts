import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import { createSecondSchool, cleanupSecondSchool } from "./helpers.js";

const DEMO = {
  username: "teacher",
  password: "teacher123",
};

describe("POST /api/auth/login", () => {
  it("returns a token and user on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: DEMO.username,
      password: DEMO.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTypeOf("string");
    expect(res.body.data.user.username).toBe(DEMO.username);
    expect(res.body.data.user.role).toBe("TEACHER");
    expect(res.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("returns 401 on wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: DEMO.username,
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 on non-existent username", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "no-such-user",
      password: "anything",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects a suspended account with 403", async () => {
    const second = await createSecondSchool();
    try {
      const res = await request(app).post("/api/auth/login").send({
        username: second.suspendedStudent.username,
        password: "suspended123",
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    } finally {
      await cleanupSecondSchool(second.school.id);
    }
  });

  it("rejects malformed payloads with 400", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "",
      password: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/auth/me", () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/login").send(DEMO);
    token = res.body.data.token;
  });

  it("returns the authenticated user without passwordHash", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe(DEMO.username);
    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 with an invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/logout", () => {
  it("returns success with a valid token", async () => {
    const login = await request(app).post("/api/auth/login").send(DEMO);
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
  });
});
