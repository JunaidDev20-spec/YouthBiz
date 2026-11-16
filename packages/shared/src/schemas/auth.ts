import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
  // Optional: when provided, scopes the lookup to a single school.
  // When omitted, the server tries all users with the given username.
  schoolSlug: z.string().max(64).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerStudentSchema = z.object({
  invitationToken: z.string().min(1),
  name: z.string().min(1).max(128),
  username: z.string().min(3).max(64).regex(/^[a-z0-9_]+$/, {
    message: "Username may only contain lowercase letters, numbers and underscores",
  }),
  password: z.string().min(8).max(128),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
