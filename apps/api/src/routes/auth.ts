import { Router } from "express";
import prisma from "../lib/prisma.js";
import { verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import { success, failure } from "../lib/api-response.js";
import { requireAuth } from "../middleware/auth.js";
import { loginSchema, registerStudentSchema } from "@youthbiz/shared";
import * as invitationService from "../services/invitation.js";
import { HttpError } from "../lib/errors.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }
    const { username, password, schoolSlug } = parsed.data;

    // Find candidate users.  Username is unique per-school, not globally,
    // so the same username may exist in different schools.  If schoolSlug
    // is provided, scope the query to that school only.
    const users = await prisma.user.findMany({
      where: {
        username,
        ...(schoolSlug ? { school: { slug: schoolSlug } } : {}),
      },
      include: { school: { select: { name: true, slug: true } } },
    });

    // Verify password against each candidate (bcrypt compare is the
    // authoritative check).  The first match wins.
    let matched = null as null | (typeof users)[number];
    for (const u of users) {
      if (verifyPassword(password, u.passwordHash)) {
        matched = u;
        break;
      }
    }

    if (!matched) {
      return failure(res, "Invalid username or password", 401);
    }

    if (matched.status === "SUSPENDED") {
      return failure(res, "This account has been suspended", 403);
    }

    const token = signToken({
      userId: matched.id,
      schoolId: matched.schoolId,
      role: matched.role,
      username: matched.username,
    });

    return success(res, {
      token,
      user: {
        id: matched.id,
        username: matched.username,
        name: matched.name,
        role: matched.role,
        schoolId: matched.schoolId,
        school: matched.school,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id_schoolId: {
          id: req.user!.userId,
          schoolId: req.user!.schoolId,
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        schoolId: true,
        school: { select: { name: true, slug: true } },
      },
    });

    if (!user) {
      return failure(res, "User not found", 404);
    }

    // passwordHash is deliberately excluded from the select above.
    return success(res, user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
// Stateless JWT: the client discards the token.  This endpoint exists
// for API symmetry and future blacklisting support.
router.post("/logout", requireAuth, (_req, res) => {
  return success(res, { message: "Logged out" });
});

// POST /api/auth/register-student
// Public endpoint: no authentication required (the invitation token
// is the authentication mechanism).  School and cohort come from the
// invitation record, never from the client.
router.post("/register-student", async (req, res, next) => {
  try {
    const parsed = registerStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return failure(res, parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const result = await invitationService.registerStudent(parsed.data);

    // Return a token so the student can start using the app immediately
    const token = signToken({
      userId: result.user.id,
      schoolId: result.schoolId,
      role: "STUDENT",
      username: result.user.username,
    });

    return success(res, { token, user: result.user }, 201);
  } catch (err) {
    if (err instanceof HttpError) {
      return failure(res, err.message, err.status);
    }
    next(err);
  }
});

export default router;
