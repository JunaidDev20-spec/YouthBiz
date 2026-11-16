import prisma from "../lib/prisma.js";
import { notFound, forbidden, conflict } from "../lib/errors.js";

// ---- Cohorts ----

export async function createCohort(schoolId: string, name: string, startDate?: string, endDate?: string) {
  const existing = await prisma.cohort.findUnique({
    where: { schoolId_name: { schoolId, name } },
  });
  if (existing) throw conflict("A cohort with this name already exists");

  return prisma.cohort.create({
    data: {
      schoolId,
      name,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
  });
}

export async function getCohorts(schoolId: string) {
  return prisma.cohort.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { teams: true, members: true } } },
  });
}

export async function getCohort(schoolId: string, cohortId: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { id_schoolId: { id: cohortId, schoolId } },
    include: { _count: { select: { teams: true, members: true } } },
  });
  if (!cohort) throw notFound("Cohort not found");
  return cohort;
}

// ---- Teams ----

export async function createTeam(schoolId: string, cohortId: string, name: string) {
  // Verify cohort belongs to school
  const cohort = await prisma.cohort.findUnique({
    where: { id_schoolId: { id: cohortId, schoolId } },
  });
  if (!cohort) throw notFound("Cohort not found");

  // Check duplicate name within cohort
  const existing = await prisma.team.findUnique({
    where: { cohortId_name: { cohortId, name } },
  });
  if (existing) throw conflict("A team with this name already exists in this cohort");

  return prisma.team.create({
    data: { schoolId, cohortId, name },
  });
}

export async function getTeams(schoolId: string, cohortId: string) {
  // Verify cohort belongs to school
  await getCohort(schoolId, cohortId);
  return prisma.team.findMany({
    where: { schoolId, cohortId },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true, businesses: true } } },
  });
}

export async function getTeam(schoolId: string, teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id_schoolId: { id: teamId, schoolId } },
    include: {
      cohort: { select: { name: true } },
      _count: { select: { members: true, businesses: true } },
    },
  });
  if (!team) throw notFound("Team not found");
  return team;
}
