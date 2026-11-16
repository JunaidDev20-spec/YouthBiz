import prisma from "../lib/prisma.js";
import { notFound, forbidden, conflict } from "../lib/errors.js";

/**
 * Get the teams the authenticated student belongs to.
 */
export async function getStudentTeams(userId: string, schoolId: string) {
  const memberships = await prisma.teamMember.findMany({
    where: { userId, schoolId },
    include: {
      team: {
        include: {
          cohort: { select: { id: true, name: true } },
          _count: { select: { members: true, businesses: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    teamId: m.teamId,
    cohortId: m.cohortId,
    joinedAt: m.joinedAt,
    team: m.team,
  }));
}

/**
 * List members of a team.  Caller must belong to the team's school.
 * Students can only view their own team; teachers can view any team
 * in their school.
 */
export async function getTeamMembers(schoolId: string, teamId: string, callerId: string, callerRole: string) {
  const team = await prisma.team.findUnique({
    where: { id_schoolId: { id: teamId, schoolId } },
  });
  if (!team) throw notFound("Team not found");

  // Students can only view their own team
  if (callerRole === "STUDENT") {
    const membership = await prisma.teamMember.findUnique({
      where: { cohortId_userId: { cohortId: team.cohortId, userId: callerId } },
    });
    if (!membership || membership.teamId !== teamId) {
      throw forbidden("You can only view your own team");
    }
  }

  return prisma.teamMember.findMany({
    where: { teamId, schoolId },
    include: {
      user: { select: { id: true, name: true, username: true, role: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
}

/**
 * Assign a student to a team.  Teacher-only.
 * The student must belong to the same school and must not already be
 * in another team in the same cohort.
 */
export async function addTeamMember(schoolId: string, teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id_schoolId: { id: teamId, schoolId } },
  });
  if (!team) throw notFound("Team not found");

  // Verify the student belongs to the same school
  const student = await prisma.user.findUnique({
    where: { id_schoolId: { id: userId, schoolId } },
  });
  if (!student) throw notFound("Student not found");
  if (student.role !== "STUDENT") throw forbidden("Only students can be assigned to teams");

  // Check if student is already in a team in this cohort
  const existing = await prisma.teamMember.findUnique({
    where: { cohortId_userId: { cohortId: team.cohortId, userId } },
  });
  if (existing) {
    if (existing.teamId === teamId) throw conflict("Student is already in this team");
    throw conflict("Student is already in another team in this cohort");
  }

  return prisma.teamMember.create({
    data: {
      schoolId,
      cohortId: team.cohortId,
      teamId,
      userId,
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
  });
}
