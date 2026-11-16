import { Router } from "express";
import { success, failure, paramId } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { addTeamMemberSchema } from "@youthbiz/shared";
import * as teamService from "../services/team.js";
import * as cohortService from "../services/cohort.js";

const router = Router();

router.use(requireAuth);

// GET /api/teams/:id
router.get("/:id", async (req, res, next) => {
  try {
    if (req.user!.role === "STUDENT") {
      // Students can only view their own team
      const teams = await teamService.getStudentTeams(req.user!.userId, req.user!.schoolId);
      const found = teams.find((t) => t.teamId === paramId(req));
      if (!found) return failure(res, "You can only view your own team", 403);
      return success(res, found);
    }
    // Teachers can view any team in their school
    const team = await cohortService.getTeam(req.user!.schoolId, paramId(req));
    return success(res, team);
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/:id/members
router.get("/:id/members", async (req, res, next) => {
  try {
    const members = await teamService.getTeamMembers(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      req.user!.role,
    );
    return success(res, members);
  } catch (err) {
    next(err);
  }
});

// POST /api/teams/:id/members — teacher only
router.post("/:id/members", requireRole("TEACHER"), async (req, res, next) => {
  try {
    const parsed = addTeamMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const member = await teamService.addTeamMember(
      req.user!.schoolId,
      paramId(req),
      parsed.data.userId,
    );
    return success(res, member, 201);
  } catch (err) {
    next(err);
  }
});

export default router;
