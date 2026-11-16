import { Router } from "express";
import { success, failure, paramId } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { stockInSchema, updateProductSchema } from "@youthbiz/shared";
import * as productService from "../services/product.js";
import * as inventoryService from "../services/inventory.js";

const router = Router();

router.use(requireAuth);

// GET /api/products/:id
router.get("/:id", async (req, res, next) => {
  try {
    const product = await productService.getProduct(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, product);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/products/:id — student only (team member)
router.patch("/:id", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const product = await productService.updateProduct(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, product);
  } catch (err) {
    next(err);
  }
});

// POST /api/products/:id/stock-in — student only (team member)
router.post("/:id/stock-in", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = stockInSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const balance = await inventoryService.stockIn(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data,
    );
    return success(res, balance, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/inventory
router.get("/:id/inventory", async (req, res, next) => {
  try {
    const balance = await inventoryService.getInventoryBalance(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, balance);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id/inventory/movements
router.get("/:id/inventory/movements", async (req, res, next) => {
  try {
    const movements = await inventoryService.getInventoryMovements(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, movements);
  } catch (err) {
    next(err);
  }
});

export default router;
