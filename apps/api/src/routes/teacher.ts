import { Router } from "express";
import { success } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as businessService from "../services/business.js";

const router = Router();

router.use(requireAuth, requireRole("TEACHER"));

// GET /api/teacher/businesses/pending
router.get("/businesses/pending", async (req, res, next) => {
  try {
    const businesses = await businessService.getPendingBusinesses(req.user!.schoolId);
    return success(res, businesses);
  } catch (err) {
    next(err);
  }
});

export default router;
