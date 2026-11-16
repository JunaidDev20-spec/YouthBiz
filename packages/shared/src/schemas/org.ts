import { z } from "zod";

// ---- School ----

export const createSchoolSchema = z.object({
  name: z.string().min(1).max(256),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug may only contain lowercase letters, numbers and hyphens",
    }),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;

// ---- Cohort ----

export const createCohortSchema = z.object({
  name: z.string().min(1).max(128),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateCohortInput = z.infer<typeof createCohortSchema>;

// ---- Team ----

export const createTeamSchema = z.object({
  cohortId: z.string().uuid(),
  name: z.string().min(1).max(128),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

// ---- Student Invitation ----

export const createInvitationSchema = z.object({
  cohortId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  expiresInHours: z.number().int().min(1).max(720).default(72),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// Body-only variant (cohortId comes from the URL param).
export const createInvitationBodySchema = z.object({
  teamId: z.string().uuid().optional(),
  expiresInHours: z.number().int().min(1).max(720).default(72),
});

export type CreateInvitationBody = z.infer<typeof createInvitationBodySchema>;

// ---- Team Membership ----

export const addTeamMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;

// Body-only variant for team creation (cohortId comes from URL).
export const createTeamBodySchema = z.object({
  name: z.string().min(1).max(128),
});

export type CreateTeamBody = z.infer<typeof createTeamBodySchema>;
