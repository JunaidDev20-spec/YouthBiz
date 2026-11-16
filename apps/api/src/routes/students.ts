import { Router } from "express";
import { success } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import * as teamService from "../services/team.js";

const router = Router();

router.use(requireAuth, requireRole("STUDENT"));

// GET /api/students/me/team
router.get("/me/team", async (req, res, next) => {
  try {
    const teams = await teamService.getStudentTeams(req.user!.userId, req.user!.schoolId);
    return success(res, teams);
  } catch (err) {
    next(err);
  }
});

export default router;
