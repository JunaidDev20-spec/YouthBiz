import prisma from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";

/**
 * Creates a second school and users for tenant-isolation tests.
 * Returns everything the tests need.  Call cleanup() in afterAll.
 */
export async function createSecondSchool() {
  const school = await prisma.school.create({
    data: {
      name: "Test School B",
      slug: "test-school-b-" + Date.now(),
    },
    select: { id: true, slug: true, name: true },
  });

  const teacher = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: "Teacher B",
      username: "teacher-b-" + Date.now(),
      passwordHash: hashPassword("teacherB123"),
      role: "TEACHER",
    },
    select: { id: true, username: true, schoolId: true },
  });

  const suspendedStudent = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: "Suspended Student",
      username: "suspended-" + Date.now(),
      passwordHash: hashPassword("suspended123"),
      role: "STUDENT",
      status: "SUSPENDED",
    },
    select: { id: true, username: true },
  });

  return { school, teacher, suspendedStudent };
}

export async function cleanupSecondSchool(schoolId: string) {
  // Delete in dependency order to satisfy FK constraints.
  await prisma.auditLog.deleteMany({ where: { schoolId } });
  await prisma.expense.deleteMany({ where: { schoolId } });
  await prisma.saleItem.deleteMany({ where: { schoolId } });
  await prisma.sale.deleteMany({ where: { schoolId } });
  await prisma.inventoryBalance.deleteMany({ where: { schoolId } });
  await prisma.inventoryMovement.deleteMany({ where: { schoolId } });
  await prisma.product.deleteMany({ where: { schoolId } });
  await prisma.businessStatusEvent.deleteMany({ where: { schoolId } });
  await prisma.business.deleteMany({ where: { schoolId } });
  await prisma.teamMember.deleteMany({ where: { schoolId } });
  await prisma.team.deleteMany({ where: { schoolId } });
  await prisma.studentInvitation.deleteMany({ where: { schoolId } });
  await prisma.cohort.deleteMany({ where: { schoolId } });
  await prisma.user.deleteMany({ where: { schoolId } });
  await prisma.school.delete({ where: { id: schoolId } });
}
