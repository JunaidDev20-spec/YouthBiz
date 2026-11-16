import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import { failure } from "../lib/api-response.js";

// Augment Express's Request type via the global namespace so that
// req.user is available in all route handlers without importing.
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export type Role = "TEACHER" | "STUDENT";

/**
 * Middleware that requires a valid Bearer token.
 * On success, attaches the decoded JWT payload to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return failure(res, "Authentication required", 401);
  }
  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return failure(res, "Invalid or expired token", 401);
  }
}

/**
 * Middleware factory that rejects requests whose authenticated role
 * is not in the allowed set.  Must be used after requireAuth.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return failure(res, "Authentication required", 401);
    }
    if (!roles.includes(req.user.role as Role)) {
      return failure(res, "Insufficient permissions", 403);
    }
    next();
  };
}
