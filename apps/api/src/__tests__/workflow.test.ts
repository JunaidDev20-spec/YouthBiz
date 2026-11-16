import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { createSecondSchool, cleanupSecondSchool } from "./helpers.js";

/**
 * Integration tests for the full school-and-student-business workflow.
 *
 * Tests run sequentially within the describe block.  Shared state
 * (cohort, team, student, business, product) is created in earlier
 * tests and reused by later ones.  All test data is cleaned up in
 * afterAll.
 */

// Shared state
let teacherToken: string;
let teacherSchoolId: string;
let cohortId: string;
let teamAId: string;
let teamBId: string;
let invitationToken: string;
let invitationId: string;
let studentToken: string;
let studentId: string;
let student2Token: string;
let student2Id: string;
let businessAId: string;
let businessBId: string;
let productAId: string;
let productBId: string;
let secondSchool: { school: { id: string }; teacher: { id: string }; suspendedStudent: { id: string } };

// Track created IDs for cleanup
const created = {
  users: [] as string[],
  cohorts: [] as string[],
  teams: [] as string[],
  invitations: [] as string[],
  businesses: [] as string[],
  products: [] as string[],
  secondSchoolId: "" as string,
};

async function login(username: string, password: string): Promise<{ token: string; schoolId: string }> {
  const res = await request(app).post("/api/auth/login").send({ username, password });
  expect(res.status).toBe(200);
  return { token: res.body.data.token, schoolId: res.body.data.user.schoolId };
}

async function registerStudent(
  token: string,
  name: string,
  username: string,
  password: string,
): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post("/api/auth/register-student")
    .send({ invitationToken: token, name, username, password });
  expect(res.status).toBe(201);
  return { token: res.body.data.token, userId: res.body.data.user.id };
}

beforeAll(async () => {
  // Login as the seeded teacher
  const loginResult = await login("teacher", "teacher123");
  teacherToken = loginResult.token;
  teacherSchoolId = loginResult.schoolId;

  // Create a second school for cross-school tests
  secondSchool = await createSecondSchool();
  created.secondSchoolId = secondSchool.school.id;
});

afterAll(async () => {
  // Clean up all test data in FK-safe order
  // 1. Inventory
  if (productAId) {
    await prisma.inventoryBalance.deleteMany({ where: { productId: productAId } });
    await prisma.inventoryMovement.deleteMany({ where: { productId: productAId } });
  }
  if (productBId) {
    await prisma.inventoryBalance.deleteMany({ where: { productId: productBId } });
    await prisma.inventoryMovement.deleteMany({ where: { productId: productBId } });
  }

  // 2. Products
  await prisma.product.deleteMany({ where: { id: { in: created.products } } });

  // 3. Business status events + businesses
  await prisma.businessStatusEvent.deleteMany({
    where: { businessId: { in: created.businesses } },
  });
  await prisma.business.deleteMany({ where: { id: { in: created.businesses } } });

  // 4. Invitations (must be before teams — FK constraint)
  await prisma.studentInvitation.deleteMany({
    where: { id: { in: created.invitations } },
  });

  // 5. Team members
  await prisma.teamMember.deleteMany({
    where: { teamId: { in: created.teams } },
  });

  // 6. Teams
  await prisma.team.deleteMany({ where: { id: { in: created.teams } } });

  // 7. Cohorts
  await prisma.cohort.deleteMany({ where: { id: { in: created.cohorts } } });

  // 8. Test users
  await prisma.user.deleteMany({ where: { id: { in: created.users } } });

  // 9. Second school
  if (created.secondSchoolId) {
    await cleanupSecondSchool(created.secondSchoolId);
  }
});

// ---- 1. Teacher creates cohort ----
it("teacher creates a cohort", async () => {
  const res = await request(app)
    .post("/api/cohorts")
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ name: "Test Cohort " + Date.now() });

  expect(res.status).toBe(201);
  expect(res.body.success).toBe(true);
  expect(res.body.data.name).toContain("Test Cohort");
  cohortId = res.body.data.id;
  created.cohorts.push(cohortId);
});

// ---- 2. Teacher creates team ----
it("teacher creates a team in the cohort", async () => {
  const res = await request(app)
    .post(`/api/cohorts/${cohortId}/teams`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ name: "Team Alpha" });

  expect(res.status).toBe(201);
  teamAId = res.body.data.id;
  created.teams.push(teamAId);
});

it("teacher creates a second team in the cohort", async () => {
  const res = await request(app)
    .post(`/api/cohorts/${cohortId}/teams`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ name: "Team Beta" });

  expect(res.status).toBe(201);
  teamBId = res.body.data.id;
  created.teams.push(teamBId);
});

it("duplicate team name in same cohort is rejected", async () => {
  const res = await request(app)
    .post(`/api/cohorts/${cohortId}/teams`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ name: "Team Alpha" });

  expect(res.status).toBe(409);
});

// ---- 3. Teacher creates invitation ----
it("teacher creates an invitation with team assignment", async () => {
  const res = await request(app)
    .post(`/api/cohorts/${cohortId}/invitations`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ teamId: teamAId, expiresInHours: 24 });

  expect(res.status).toBe(201);
  expect(res.body.data.token).toBeTypeOf("string");
  expect(res.body.data.invitation.teamId).toBe(teamAId);
  invitationToken = res.body.data.token;
  invitationId = res.body.data.invitation.id;
  created.invitations.push(invitationId);
});

// ---- 4. Student registers using valid invitation ----
it("student registers using a valid invitation", async () => {
  const res = await request(app)
    .post("/api/auth/register-student")
    .send({
      invitationToken,
      name: "Test Student One",
      username: "teststu" + Date.now(),
      password: "testpass123",
    });

  expect(res.status).toBe(201);
  expect(res.body.data.token).toBeTypeOf("string");
  expect(res.body.data.user.role).toBe("STUDENT");
  studentToken = res.body.data.token;
  studentId = res.body.data.user.id;
  created.users.push(studentId);
});

// ---- 5. Expired invitation is rejected ----
it("expired invitation is rejected", async () => {
  // Create an invitation and manually expire it
  const invRes = await request(app)
    .post(`/api/cohorts/${cohortId}/invitations`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ teamId: teamBId, expiresInHours: 24 });

  const token = invRes.body.data.token;
  const invId = invRes.body.data.invitation.id;
  created.invitations.push(invId);

  // Expire it in the database
  await prisma.studentInvitation.update({
    where: { id: invId },
    data: { expiresAt: new Date(Date.now() - 60000) }, // 1 minute ago
  });

  const res = await request(app)
    .post("/api/auth/register-student")
    .send({
      invitationToken: token,
      name: "Expired Student",
      username: "expiredstu" + Date.now(),
      password: "expiredpass123",
    });

  expect(res.status).toBe(403);
  expect(res.body.success).toBe(false);
});

// ---- 6. Reused invitation is rejected ----
it("reused invitation is rejected", async () => {
  const res = await request(app)
    .post("/api/auth/register-student")
    .send({
      invitationToken, // same token as test 4
      name: "Reused Student",
      username: "reusedstu" + Date.now(),
      password: "reusedpass123",
    });

  expect(res.status).toBe(409);
  expect(res.body.success).toBe(false);
});

// ---- 7. Student is assigned to the correct school and team ----
it("student is assigned to the correct school and team", async () => {
  // Verify via /me
  const meRes = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${studentToken}`);

  expect(meRes.status).toBe(200);
  expect(meRes.body.data.schoolId).toBe(teacherSchoolId);

  // Verify via /students/me/team
  const teamRes = await request(app)
    .get("/api/students/me/team")
    .set("Authorization", `Bearer ${studentToken}`);

  expect(teamRes.status).toBe(200);
  const teams = teamRes.body.data;
  expect(teams.length).toBeGreaterThan(0);
  const assignedTeam = teams.find((t: { teamId: string }) => t.teamId === teamAId);
  expect(assignedTeam).toBeDefined();
});

// ---- 8. Student cannot join a team in another school ----
it("student cannot be assigned to a team in another school", async () => {
  // Create a cohort + team in the second school
  const secondCohort = await prisma.cohort.create({
    data: {
      schoolId: created.secondSchoolId,
      name: "Second School Cohort " + Date.now(),
    },
  });

  const secondTeam = await prisma.team.create({
    data: {
      schoolId: created.secondSchoolId,
      cohortId: secondCohort.id,
      name: "Second School Team",
    },
  });

  // Try to add student from school A to school B's team
  const res = await request(app)
    .post(`/api/teams/${secondTeam.id}/members`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ userId: studentId });

  expect(res.status).toBe(404); // Team not found in teacher's school
  // cleanupSecondSchool will delete these
});

// ---- 9. Student registers business ----
it("student registers a business for their team", async () => {
  const res = await request(app)
    .post("/api/businesses")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({
      teamId: teamAId,
      name: "Test Business Alpha",
      description: "A test business",
    });

  expect(res.status).toBe(201);
  expect(res.body.data.status).toBe("PENDING");
  businessAId = res.body.data.id;
  created.businesses.push(businessAId);
});

it("one business per team is enforced", async () => {
  const res = await request(app)
    .post("/api/businesses")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({
      teamId: teamAId,
      name: "Second Business",
    });

  expect(res.status).toBe(409);
});

// ---- 10. Teacher approves business ----
it("teacher approves the business", async () => {
  const res = await request(app)
    .post(`/api/businesses/${businessAId}/approve`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ note: "Looks good" });

  expect(res.status).toBe(200);
  expect(res.body.data.status).toBe("APPROVED");
});

// ---- 11. Rejected business cannot create products ----
it("rejected business cannot create products", async () => {
  // Create a second student and business on team B
  const invRes = await request(app)
    .post(`/api/cohorts/${cohortId}/invitations`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ teamId: teamBId, expiresInHours: 24 });

  created.invitations.push(invRes.body.data.invitation.id);

  const regResult = await registerStudent(
    invRes.body.data.token,
    "Test Student Two",
    "teststu2" + Date.now(),
    "testpass456",
  );
  student2Token = regResult.token;
  student2Id = regResult.userId;
  created.users.push(student2Id);

  // Create business on team B
  const bizRes = await request(app)
    .post("/api/businesses")
    .set("Authorization", `Bearer ${student2Token}`)
    .send({ teamId: teamBId, name: "Test Business Beta" });

  expect(bizRes.status).toBe(201);
  businessBId = bizRes.body.data.id;
  created.businesses.push(businessBId);

  // Reject it
  const rejectRes = await request(app)
    .post(`/api/businesses/${businessBId}/reject`)
    .set("Authorization", `Bearer ${teacherToken}`)
    .send({ note: "Not viable" });

  expect(rejectRes.status).toBe(200);
  expect(rejectRes.body.data.status).toBe("REJECTED");

  // Try to create a product on the rejected business
  const productRes = await request(app)
    .post(`/api/businesses/${businessBId}/products`)
    .set("Authorization", `Bearer ${student2Token}`)
    .send({ name: "Rejected Product" });

  expect(productRes.status).toBe(403);
});

// ---- 12. Approved business can create products ----
it("approved business can create products", async () => {
  const res = await request(app)
    .post(`/api/businesses/${businessAId}/products`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ name: "Test Product", unit: "piece" });

  expect(res.status).toBe(201);
  expect(res.body.data.name).toBe("Test Product");
  productAId = res.body.data.id;
  created.products.push(productAId);
});

// ---- 15. Duplicate product names are rejected ----
it("duplicate product names within a business are rejected", async () => {
  const res = await request(app)
    .post(`/api/businesses/${businessAId}/products`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ name: "Test Product" });

  expect(res.status).toBe(409);
});

// ---- 13. Student can stock-in inventory ----
it("student can stock-in inventory", async () => {
  const res = await request(app)
    .post(`/api/products/${productAId}/stock-in`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ quantity: 50, unitCostPaise: 1000, note: "Initial stock" });

  expect(res.status).toBe(201);
  expect(res.body.data.quantityOnHand).toBe(50);
  expect(res.body.data.inventoryValuePaise).toBe(50000);
  expect(res.body.data.averageUnitCostPaise).toBe(1000);
});

// ---- 14. Stock-in updates quantity and inventory value correctly ----
it("second stock-in updates weighted average cost correctly", async () => {
  // Stock in 25 more at ₹12 = 1200 paise
  const res = await request(app)
    .post(`/api/products/${productAId}/stock-in`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ quantity: 25, unitCostPaise: 1200 });

  expect(res.status).toBe(201);
  // Total: 50 @ 1000 + 25 @ 1200 = 50000 + 30000 = 80000 paise
  // Qty: 75, Avg: floor(80000 / 75) = 1066 paise
  expect(res.body.data.quantityOnHand).toBe(75);
  expect(res.body.data.inventoryValuePaise).toBe(80000);
  expect(res.body.data.averageUnitCostPaise).toBe(1066);
});

// ---- 16. Cross-school access is rejected ----
it("cross-school product access is rejected", async () => {
  // Create a full chain in the second school
  const sc = await prisma.cohort.create({
    data: { schoolId: created.secondSchoolId, name: "XS Cohort " + Date.now() },
  });
  const st = await prisma.team.create({
    data: { schoolId: created.secondSchoolId, cohortId: sc.id, name: "XS Team" },
  });
  const sb = await prisma.business.create({
    data: { schoolId: created.secondSchoolId, teamId: st.id, name: "XS Business", status: "APPROVED" },
  });
  const sp = await prisma.product.create({
    data: { schoolId: created.secondSchoolId, businessId: sb.id, name: "XS Product" },
  });

  // Student from school A tries to access school B's product
  const res = await request(app)
    .get(`/api/products/${sp.id}`)
    .set("Authorization", `Bearer ${studentToken}`);

  expect(res.status).toBe(404);

  // Also try stock-in on the second school's product
  const stockRes = await request(app)
    .post(`/api/products/${sp.id}/stock-in`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ quantity: 10, unitCostPaise: 1000 });

  expect(stockRes.status).toBe(404);
  // cleanupSecondSchool handles cleanup
});

// ---- 17. Concurrent stock-in operations do not corrupt inventory balances ----
it("concurrent stock-in operations do not corrupt inventory balances", async () => {
  // Create a fresh product for this test
  const productRes = await request(app)
    .post(`/api/businesses/${businessAId}/products`)
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ name: "Concurrent Product " + Date.now() });

  expect(productRes.status).toBe(201);
  productBId = productRes.body.data.id;
  created.products.push(productBId);

  // Run 5 concurrent stock-ins, each adding 10 units at 1000 paise
  const concurrentCount = 5;
  const results = await Promise.all(
    Array.from({ length: concurrentCount }, () =>
      request(app)
        .post(`/api/products/${productBId}/stock-in`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ quantity: 10, unitCostPaise: 1000 }),
    ),
  );

  // All should succeed
  for (const r of results) {
    expect(r.status).toBe(201);
  }

  // Verify the final balance
  const balanceRes = await request(app)
    .get(`/api/products/${productBId}/inventory`)
    .set("Authorization", `Bearer ${studentToken}`);

  expect(balanceRes.status).toBe(200);
  expect(balanceRes.body.data.quantityOnHand).toBe(50); // 5 * 10
  expect(balanceRes.body.data.inventoryValuePaise).toBe(50000); // 5 * 10 * 1000
  expect(balanceRes.body.data.averageUnitCostPaise).toBe(1000);

  // Verify movement count
  const movementsRes = await request(app)
    .get(`/api/products/${productBId}/inventory/movements`)
    .set("Authorization", `Bearer ${studentToken}`);

  expect(movementsRes.status).toBe(200);
  expect(movementsRes.body.data.length).toBe(concurrentCount);
});
