import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";

/**
 * Recursively strips keys that start with `$` or contain `.` from an object.
 * Prevents NoSQL operator injection via `req.body` (e.g. `{ email: { $ne: "" } }`).
 * Only mutates `req.body` since Express 5 makes `req.query` / `req.params` read-only accessors.
 */
function scrubKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    value.forEach((v, i) => (value[i] = scrubKeys(v)));
    return value;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else {
      obj[key] = scrubKeys(obj[key]);
    }
  }
  return obj;
}

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === "object") scrubKeys(req.body);
  next();
};

/**
 * Throttle Google ID-token verification. Each call hits Google's tokeninfo /
 * cached JWKS, so this protects both us (CPU) and Google (rate limits) from a
 * burst of bogus tokens. Per-IP because the user isn't authenticated yet.
 */
export const googleAuthRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ""),
  message: { success: false, message: "Too many sign-in attempts. Try again in a minute." },
});

/** Looser cap for refresh since browsers fire it on startup and reconnects. */
export const refreshRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many refresh attempts." },
});

/** Expensive AI path — per-user (if authenticated) or per-IP key. */
export const analysisRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    if (userId) return userId;
    // ipKeyGenerator normalizes IPv6 into a /64 subnet key so individual IPv6 users can't bypass limits.
    return ipKeyGenerator(req.ip ?? "");
  },
  message: { success: false, message: "Too many analysis requests. Slow down." },
});
