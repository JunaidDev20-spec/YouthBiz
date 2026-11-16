import { Router } from "express";
import { success, failure, paramId } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { reverseExpenseSchema } from "@youthbiz/shared";
import * as expenseService from "../services/expense.js";

const router = Router();

router.use(requireAuth);

// GET /api/expenses/:id
router.get("/:id", async (req, res, next) => {
  try {
    const expense = await expenseService.getExpense(
      req.user!.schoolId,
      paramId(req),
      req.user!.role,
      req.user!.userId,
    );
    return success(res, expense);
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses/:id/reverse — student only (team member)
router.post("/:id/reverse", requireRole("STUDENT"), async (req, res, next) => {
  try {
    const parsed = reverseExpenseSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const result = await expenseService.reverseExpense(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      parsed.data.reversalNote,
    );
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
