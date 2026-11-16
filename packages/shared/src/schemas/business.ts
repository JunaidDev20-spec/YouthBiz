import { z } from "zod";

export const createBusinessSchema = z.object({
  teamId: z.string().uuid(),
  name: z.string().min(1).max(256),
  description: z.string().max(1024).optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(1024).optional(),
});

export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

export const reviewBusinessSchema = z.object({
  note: z.string().max(1024).optional(),
});

export type ReviewBusinessInput = z.infer<typeof reviewBusinessSchema>;
