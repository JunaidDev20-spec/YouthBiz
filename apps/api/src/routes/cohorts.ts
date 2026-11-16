import { Router } from "express";
import { success, failure, paramId } from "../lib/api-response.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createCohortSchema, createTeamBodySchema, createInvitationBodySchema } from "@youthbiz/shared";
import * as cohortService from "../services/cohort.js";
import * as invitationService from "../services/invitation.js";

const router = Router();

// All cohort endpoints are teacher-only
router.use(requireAuth, requireRole("TEACHER"));

// POST /api/cohorts
router.post("/", async (req, res, next) => {
  try {
    const parsed = createCohortSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const cohort = await cohortService.createCohort(
      req.user!.schoolId,
      parsed.data.name,
      parsed.data.startDate,
      parsed.data.endDate,
    );
    return success(res, cohort, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/cohorts
router.get("/", async (req, res, next) => {
  try {
    const cohorts = await cohortService.getCohorts(req.user!.schoolId);
    return success(res, cohorts);
  } catch (err) {
    next(err);
  }
});

// GET /api/cohorts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const cohort = await cohortService.getCohort(req.user!.schoolId, paramId(req));
    return success(res, cohort);
  } catch (err) {
    next(err);
  }
});

// POST /api/cohorts/:id/teams
router.post("/:id/teams", async (req, res, next) => {
  try {
    const parsed = createTeamBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const team = await cohortService.createTeam(
      req.user!.schoolId,
      paramId(req),
      parsed.data.name,
    );
    return success(res, team, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/cohorts/:id/teams
router.get("/:id/teams", async (req, res, next) => {
  try {
    const teams = await cohortService.getTeams(req.user!.schoolId, paramId(req));
    return success(res, teams);
  } catch (err) {
    next(err);
  }
});

// POST /api/cohorts/:id/invitations
router.post("/:id/invitations", async (req, res, next) => {
  try {
    const parsed = createInvitationBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const { invitation, token } = await invitationService.createInvitation(
      req.user!.schoolId,
      paramId(req),
      req.user!.userId,
      { teamId: parsed.data.teamId, expiresInHours: parsed.data.expiresInHours },
    );
    return success(res, { invitation, token }, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/cohorts/:id/invitations
router.get("/:id/invitations", async (req, res, next) => {
  try {
    const invitations = await invitationService.getInvitations(
      req.user!.schoolId,
      paramId(req),
    );
    return success(res, invitations);
  } catch (err) {
    next(err);
  }
});

export default router;
