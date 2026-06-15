import { ipKeyGenerator } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { createRateLimiter } from "./rate-limit.js";

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
 * Shared key function: per-user when authenticated, per-IP otherwise.
 */
const userOrIp = (req: Request): string => {
  const userId = (req as Request & { user?: { id?: string } }).user?.id;
  return userId ? `u:${userId}` : `ip:${ipKeyGenerator(req.ip ?? "")}`;
};

export const googleAuthRateLimiter = createRateLimiter({
  prefix: "rl:google-auth",
  tokens: 20,
  window: "60 s",
  message: "Too many sign-in attempts. Try again in a minute.",
});

export const refreshRateLimiter = createRateLimiter({
  prefix: "rl:refresh",
  tokens: 30,
  window: "60 s",
  message: "Too many refresh attempts.",
});

export const analysisRateLimiter = createRateLimiter({
  prefix: "rl:analysis",
  tokens: 5,
  window: "60 s",
  keyFn: userOrIp,
  message: "Too many analysis requests. Slow down.",
});

export const uploadSignRateLimiter = createRateLimiter({
  prefix: "rl:upload-sign",
  tokens: 30,
  window: "60 s",
  keyFn: userOrIp,
  message: "Too many upload requests. Slow down.",
});

export const writeRateLimiter = createRateLimiter({
  prefix: "rl:write",
  tokens: 30,
  window: "60 s",
  keyFn: userOrIp,
  message: "You're doing that too fast. Slow down.",
});

export const reactionRateLimiter = createRateLimiter({
  prefix: "rl:reaction",
  tokens: 60,
  window: "60 s",
  keyFn: userOrIp,
  message: "Too many reactions. Slow down.",
});

export const recruiterRateLimiter = createRateLimiter({
  prefix: "rl:recruiter",
  tokens: 30,
  window: "60 s",
  keyFn: userOrIp,
  message: "Too many search requests. Slow down.",
});

export const publicReadRateLimiter = createRateLimiter({
  prefix: "rl:public-read",
  tokens: 120,
  window: "60 s",
  message: "Too many requests. Slow down.",
});

export const piiDetectRateLimiter = createRateLimiter({
  prefix: "rl:pii-detect",
  tokens: 15,
  window: "60 s",
  keyFn: userOrIp,
  message: "Too many requests. Slow down.",
});
