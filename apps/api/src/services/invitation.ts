import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { notFound, forbidden, conflict, badRequest, HttpError } from "../lib/errors.js";

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Create an invitation for a cohort.  The teacher must belong to the
 * cohort's school.  If teamId is provided, the team must belong to the
 * same cohort and school.
 *
 * Returns the raw token (only once) and the invitation metadata.
 * The token hash is stored; the raw token is never persisted.
 */
export async function createInvitation(
  schoolId: string,
  cohortId: string,
  createdById: string,
  options: { teamId?: string; expiresInHours?: number },
) {
  // Verify cohort belongs to school
  const cohort = await prisma.cohort.findUnique({
    where: { id_schoolId: { id: cohortId, schoolId } },
  });
  if (!cohort) throw notFound("Cohort not found");

  // If teamId provided, verify it belongs to the same cohort + school
  if (options.teamId) {
    const team = await prisma.team.findUnique({
      where: { id_schoolId: { id: options.teamId, schoolId } },
    });
    if (!team) throw notFound("Team not found");
    if (team.cohortId !== cohortId) {
      throw badRequest("Team does not belong to this cohort");
    }
  }

  const expiresInHours = options.expiresInHours ?? 72;
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  const invitation = await prisma.studentInvitation.create({
    data: {
      schoolId,
      cohortId,
      createdById,
      teamId: options.teamId,
      tokenHash,
      expiresAt,
    },
    select: {
      id: true,
      cohortId: true,
      teamId: true,
      expiresAt: true,
      createdAt: true,
      redeemedAt: true,
    },
  });

  return { invitation, token: rawToken };
}

/**
 * List invitations for a cohort (teacher view).
 * Never returns token hashes.
 */
export async function getInvitations(schoolId: string, cohortId: string) {
  // Verify cohort belongs to school
  const cohort = await prisma.cohort.findUnique({
    where: { id_schoolId: { id: cohortId, schoolId } },
  });
  if (!cohort) throw notFound("Cohort not found");

  return prisma.studentInvitation.findMany({
    where: { schoolId, cohortId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      expiresAt: true,
      redeemedAt: true,
      createdAt: true,
      teamId: true,
    },
  });
}

/**
 * Register a student from an invitation token.
 * School and cohort come from the invitation, never from the client.
 * If the invitation has a teamId, the student is assigned to that team.
 *
 * Registration and invitation redemption happen atomically.
 */
export async function registerStudent(input: {
  invitationToken: string;
  name: string;
  username: string;
  password: string;
}) {
  const tokenHash = hashToken(input.invitationToken);

  return prisma.$transaction(async (tx) => {
    // Look up the invitation by token hash
    const inv = await tx.studentInvitation.findUnique({
      where: { tokenHash },
    });

    if (!inv) {
      throw badRequest("Invalid invitation token");
    }

    if (inv.redeemedAt !== null) {
      throw conflict("This invitation has already been used");
    }

    if (inv.expiresAt < new Date()) {
      throw forbidden("This invitation has expired");
    }

    // Check username uniqueness within the school
    const existing = await tx.user.findUnique({
      where: {
        schoolId_username: {
          schoolId: inv.schoolId,
          username: input.username,
        },
      },
    });
    if (existing) {
      throw conflict("Username already taken in this school");
    }

    // Create the user
    const user = await tx.user.create({
      data: {
        schoolId: inv.schoolId,
        name: input.name,
        username: input.username,
        passwordHash: hashPassword(input.password),
        role: "STUDENT",
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        schoolId: true,
      },
    });

    // If invitation specifies a team, assign the student to it
    if (inv.teamId) {
      await tx.teamMember.create({
        data: {
          schoolId: inv.schoolId,
          cohortId: inv.cohortId,
          teamId: inv.teamId,
          userId: user.id,
        },
      });
    }

    // Atomically claim the invitation (prevents concurrent registration).
    // If another request already redeemed it, this returns count=0
    // and the transaction rolls back (undoing the user creation).
    const claimed = await tx.studentInvitation.updateMany({
      where: { id: inv.id, redeemedAt: null },
      data: { redeemedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw conflict("This invitation has already been used");
    }

    return { user, schoolId: inv.schoolId, cohortId: inv.cohortId, teamId: inv.teamId };
  });
}
