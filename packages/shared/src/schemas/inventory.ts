import { z } from "zod";

// ---- Product ----

export const createProductSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(1024).optional(),
  sku: z.string().max(64).optional(),
  unit: z.string().min(1).max(32).default("piece"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(1024).optional(),
  sku: z.string().max(64).optional(),
  unit: z.string().min(1).max(32).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ---- Stock-in ----

export const stockInSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitCostPaise: z.number().int().min(1, "Unit cost must be at least 1 paise"),
  note: z.string().max(512).optional(),
});

export type StockInInput = z.infer<typeof stockInSchema>;
