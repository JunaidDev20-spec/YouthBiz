import { Router } from "express";
import { success, failure, paramId } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createBusinessSchema,
  reviewBusinessSchema,
  createProductSchema,
  createSaleSchema,
  createExpenseSchema,
  summaryQuerySchema,
  transactionQuerySchema,
} from "@youthbiz/shared";
import * as businessService from "../services/business.js";
import * as productService from "../services/product.js";
import * as saleService from "../services/sale.js";
import * as expenseService from "../services/expense.js";
import * as financialService from "../services/financial.js";

const router = Router();

router.use(requireAuth);

// POST /api/businesses — student only
router.post("/", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = createBusinessSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const business = await businessService.createBusiness(
      req.user!.schoolId,
      req.user!.userId,
      parsed.data,
    );
    return success(res, business, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses — scoped by role
router.get("/", async (req, res, next) => {
  try {
    const businesses = await businessService.getBusinesses(
      req.user!.schoolId,
      req.user!.role,
      req.user!.userId,
    );
    return success(res, businesses);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id — scoped by role + team membership
router.get("/:id", async (req, res, next) => {
  try {
    const business = await businessService.getBusiness(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, business);
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/approve — teacher only
router.post("/:id/approve", requireRole("TEACHER"), async (req, res, next) => {
  try {
    const parsed = reviewBusinessSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const business = await businessService.approveBusiness(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data.note,
    );
    return success(res, business);
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/reject — teacher only
router.post("/:id/reject", requireRole("TEACHER"), async (req, res, next) => {
  try {
    const parsed = reviewBusinessSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const business = await businessService.rejectBusiness(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data.note,
    );
    return success(res, business);
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/products — student only
router.post("/:id/products", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const product = await productService.createProduct(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, product, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id/products — any authenticated user
router.get("/:id/products", async (req, res, next) => {
  try {
    const products = await productService.getProducts(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, products);
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/sales — student only
router.post("/:id/sales", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = createSaleSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const sale = await saleService.createSale(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, sale, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id/sales
router.get("/:id/sales", async (req, res, next) => {
  try {
    const sales = await saleService.getSales(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, sales);
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses/:id/expenses — student only
router.post("/:id/expenses", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const expense = await expenseService.createExpense(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, expense, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id/expenses
router.get("/:id/expenses", async (req, res, next) => {
  try {
    const expenses = await expenseService.getExpenses(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, expenses);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id/summary
router.get("/:id/summary", async (req, res, next) => {
  try {
    const parsed = summaryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }
    const summary = await financialService.getSummary(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
      parsed.data.from,
      parsed.data.to,
    );
    return success(res, summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/:id/transactions
router.get("/:id/transactions", async (req, res, next) => {
  try {
    const parsed = transactionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid query", 400);
    }
    const transactions = await financialService.getTransactions(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
      parsed.data.page,
      parsed.data.limit,
      parsed.data.from,
      parsed.data.to,
    );
    return success(res, transactions);
  } catch (err) {
    next(err);
  }
});

export default router;
