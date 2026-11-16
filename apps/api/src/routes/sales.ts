import { Router } from "express";
import { success, failure, paramId } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { reverseSaleSchema } from "@youthbiz/shared";
import * as saleService from "../services/sale.js";

const router = Router();

router.use(requireAuth);

// GET /api/sales/:id
router.get("/:id", async (req, res, next) => {
  try {
    const sale = await saleService.getSale(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, sale);
  } catch (err) {
    next(err);
  }
});

// POST /api/sales/:id/reverse — student only (team member)
router.post("/:id/reverse", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = reverseSaleSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const sale = await saleService.reverseSale(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data.reversalNote,
    );
    return success(res, sale);
  } catch (err) {
    next(err);
  }
});

export default router;
