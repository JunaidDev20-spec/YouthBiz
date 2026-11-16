import type { Response } from "express";

export function success<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function failure(
  res: Response,
  message: string,
  status = 400
): Response {
  return res.status(status).json({ success: false, error: { message } });
}

/**
 * Safely extract a route parameter, asserting it is a string.
 * Express always provides params as strings for matching routes,
 * but TypeScript's noUncheckedIndexedAccess makes the type
 * string | string[] | undefined.
 */
export function paramId(req: { params: Record<string, unknown> }, name = "id"): string {
  return req.params[name] as string;
}
