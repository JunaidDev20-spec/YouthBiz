import { z } from "zod";

// ---- Sale ----

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitSellingPricePaise: z
    .number()
    .int()
    .min(1, "Selling price must be at least 1 paise"),
});

export type SaleItemInput = z.infer<typeof saleItemSchema>;

export const createSaleSchema = z.object({
  items: z
    .array(saleItemSchema)
    .min(1, "A sale must contain at least one item"),
  note: z.string().max(512).optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const reverseSaleSchema = z.object({
  reversalNote: z.string().max(512).optional(),
});

export type ReverseSaleInput = z.infer<typeof reverseSaleSchema>;

// ---- Expense ----

const expenseCategoryEnum = z.enum([
  "SUPPLIES",
  "TRANSPORT",
  "MARKETING",
  "UTILITIES",
  "PACKAGING",
  "OTHER",
]);

export const createExpenseSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(1024).optional(),
  category: expenseCategoryEnum.default("OTHER"),
  amountPaise: z.number().int().min(1, "Amount must be at least 1 paise"),
  incurredAt: z.string().datetime().optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const reverseExpenseSchema = z.object({
  reversalNote: z.string().max(512).optional(),
});

export type ReverseExpenseInput = z.infer<typeof reverseExpenseSchema>;

// ---- Summary & Transaction queries ----

export const summaryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type SummaryQuery = z.infer<typeof summaryQuerySchema>;

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
