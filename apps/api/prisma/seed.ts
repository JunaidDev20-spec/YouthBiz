/**
 * YouthBiz Demo Seed Script
 *
 * Creates a demo school, teacher, students, cohort, and team.
 * Safe to rerun: existing records are reused, not duplicated.
 *
 * Run with: pnpm --filter api db:seed
 */
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

// Load .env before importing PrismaClient.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

// ---- Demo credentials ----
const DEMO = {
  schoolName: "Greenwood High",
  schoolSlug: "greenwood-high",
  cohortName: "2026 Cohort",
  teamName: "Team Alpha",
  teacher: { name: "Ms. Patel", username: "teacher", password: "teacher123" },
  student1: { name: "Aarav Sharma", username: "student1", password: "student123" },
  student2: { name: "Diya Verma", username: "student2", password: "student123" },
} as const;

async function main() {
  // School
  const school = await prisma.school.upsert({
    where: { slug: DEMO.schoolSlug },
    update: { name: DEMO.schoolName },
    create: { name: DEMO.schoolName, slug: DEMO.schoolSlug },
  });

  // Teacher
  const teacher = await prisma.user.upsert({
    where: { schoolId_username: { schoolId: school.id, username: DEMO.teacher.username } },
    update: {},
    create: {
      schoolId: school.id,
      name: DEMO.teacher.name,
      username: DEMO.teacher.username,
      passwordHash: hashPassword(DEMO.teacher.password),
      role: "TEACHER",
    },
  });

  // Students
  const student1 = await prisma.user.upsert({
    where: { schoolId_username: { schoolId: school.id, username: DEMO.student1.username } },
    update: {},
    create: {
      schoolId: school.id,
      name: DEMO.student1.name,
      username: DEMO.student1.username,
      passwordHash: hashPassword(DEMO.student1.password),
      role: "STUDENT",
    },
  });

  const student2 = await prisma.user.upsert({
    where: { schoolId_username: { schoolId: school.id, username: DEMO.student2.username } },
    update: {},
    create: {
      schoolId: school.id,
      name: DEMO.student2.name,
      username: DEMO.student2.username,
      passwordHash: hashPassword(DEMO.student2.password),
      role: "STUDENT",
    },
  });

  // Cohort
  const cohort = await prisma.cohort.upsert({
    where: { schoolId_name: { schoolId: school.id, name: DEMO.cohortName } },
    update: {},
    create: { schoolId: school.id, name: DEMO.cohortName },
  });

  // Team
  const team = await prisma.team.upsert({
    where: { cohortId_name: { cohortId: cohort.id, name: DEMO.teamName } },
    update: {},
    create: { schoolId: school.id, cohortId: cohort.id, name: DEMO.teamName },
  });

  // Team members — assign both students to the team
  for (const student of [student1, student2]) {
    await prisma.teamMember.upsert({
      where: { cohortId_userId: { cohortId: cohort.id, userId: student.id } },
      update: {},
      create: {
        schoolId: school.id,
        cohortId: cohort.id,
        teamId: team.id,
        userId: student.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log("=".repeat(60));
  console.log("Demo School : %s (slug: %s)", school.name, school.slug);
  console.log("Teacher     : %s / %s", DEMO.teacher.username, DEMO.teacher.password);
  console.log("Student 1   : %s / %s", DEMO.student1.username, DEMO.student1.password);
  console.log("Student 2   : %s / %s", DEMO.student2.username, DEMO.student2.password);
  console.log("Cohort      : %s", cohort.name);
  console.log("Team        : %s", team.name);
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
