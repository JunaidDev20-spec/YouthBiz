import prisma from "../lib/prisma.js";
import { notFound, forbidden, conflict } from "../lib/errors.js";

/**
 * Create a business for a team.  Only students who are members of
 * the team can do this.  One business per team (enforced by DB unique
 * constraint on Business.teamId).
 */
export async function createBusiness(
  schoolId: string,
  studentId: string,
  data: { teamId: string; name: string; description?: string },
) {
  // Verify the team belongs to the school and the student is a member
  const team = await prisma.team.findUnique({
    where: { id_schoolId: { id: data.teamId, schoolId } },
    include: { members: { where: { userId: studentId } } },
  });
  if (!team) throw notFound("Team not found");
  if (team.members.length === 0) throw forbidden("You are not a member of this team");

  // Check if the team already has a business (DB also enforces this)
  const existing = await prisma.business.findUnique({
    where: { teamId: data.teamId },
  });
  if (existing) throw conflict("This team already has a business");

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        schoolId,
        teamId: data.teamId,
        name: data.name,
        description: data.description,
        status: "PENDING",
      },
      include: {
        team: { select: { name: true, cohort: { select: { name: true } } } },
      },
    });

    await tx.businessStatusEvent.create({
      data: {
        schoolId,
        businessId: business.id,
        event: "SUBMITTED",
        createdById: studentId,
      },
    });

    return business;
  });
}

/**
 * List businesses.  Teachers see all in their school; students see
 * only businesses for teams they belong to.
 */
export async function getBusinesses(schoolId: string, role: string, userId: string) {
  if (role === "TEACHER") {
    return prisma.business.findMany({
      where: { schoolId },
      include: {
        team: { select: { name: true, cohort: { select: { name: true } } } },
        statusEvents: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Student — only businesses for their teams
  const memberships = await prisma.teamMember.findMany({
    where: { userId, schoolId },
    select: { teamId: true },
  });
  const teamIds = memberships.map((m) => m.teamId);

  return prisma.business.findMany({
    where: { schoolId, teamId: { in: teamIds } },
    include: {
      team: { select: { name: true, cohort: { select: { name: true } } } },
      statusEvents: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get a single business.  Teachers can view any business in their
 * school; students can only view businesses for their own teams.
 */
export async function getBusiness(schoolId: string, businessId: string, role: string, userId: string) {
  const business = await prisma.business.findUnique({
    where: { id_schoolId: { id: businessId, schoolId } },
    include: {
      team: { select: { name: true, cohort: { select: { name: true } } } },
      statusEvents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!business) throw notFound("Business not found");

  // Students can only see their own team's business
  if (role === "STUDENT") {
    const membership = await prisma.teamMember.findFirst({
      where: { userId, teamId: business.teamId, schoolId },
    });
    if (!membership) throw forbidden("You do not have access to this business");
  }

  return business;
}

/**
 * Teacher-only: list pending businesses in the school.
 */
export async function getPendingBusinesses(schoolId: string) {
  return prisma.business.findMany({
    where: { schoolId, status: "PENDING" },
    include: {
      team: {
        select: {
          name: true,
          cohort: { select: { name: true } },
          members: {
            select: { user: { select: { id: true, name: true, username: true } } },
          },
        },
      },
      statusEvents: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Teacher-only: approve a pending business.
 * Records a BusinessStatusEvent.
 */
export async function approveBusiness(
  schoolId: string,
  businessId: string,
  teacherId: string,
  note?: string,
) {
  const business = await prisma.business.findUnique({
    where: { id_schoolId: { id: businessId, schoolId } },
  });
  if (!business) throw notFound("Business not found");
  if (business.status !== "PENDING") throw conflict("Business is not pending");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.business.update({
      where: { id: businessId },
      data: { status: "APPROVED" },
      include: {
        team: { select: { name: true, cohort: { select: { name: true } } } },
      },
    });
    await tx.businessStatusEvent.create({
      data: {
        schoolId,
        businessId,
        event: "APPROVED",
        note,
        createdById: teacherId,
      },
    });
    return updated;
  });
}

/**
 * Teacher-only: reject a pending business.
 * Records a BusinessStatusEvent.
 */
export async function rejectBusiness(
  schoolId: string,
  businessId: string,
  teacherId: string,
  note?: string,
) {
  const business = await prisma.business.findUnique({
    where: { id_schoolId: { id: businessId, schoolId } },
  });
  if (!business) throw notFound("Business not found");
  if (business.status !== "PENDING") throw conflict("Business is not pending");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.business.update({
      where: { id: businessId },
      data: { status: "REJECTED" },
      include: {
        team: { select: { name: true, cohort: { select: { name: true } } } },
      },
    });
    await tx.businessStatusEvent.create({
      data: {
        schoolId,
        businessId,
        event: "REJECTED",
        note,
        createdById: teacherId,
      },
    });
    return updated;
  });
}
