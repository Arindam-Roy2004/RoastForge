import { ipKeyGenerator } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { createRateLimiter } from "./rate-limit.js";
import { createDailyBudgetGuard } from "./daily-budget.js";

/**
 * Recursively strips keys starting with `$` or containing `.` to block NoSQL
 * operator injection via `req.body` (e.g. `{ email: { $ne: "" } }` matches any
 * document).
 *
 * Not using express-mongo-sanitize: it sanitizes by reassigning `req.query`,
 * which Express 5 made a getter, so it throws or silently no-ops. It's also
 * unmaintained.
 *
 * Body-only is sufficient — `req.query`/`req.params` are read-only accessors in
 * Express 5, and its default `simple` query parser yields the literal key
 * `email[$ne]` rather than a nested object.
 *
 * Defence in depth; Joi DTO validation is the primary control. `seen` prevents
 * unbounded recursion on a self-referential object.
 */
function scrubKeys(value: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return value;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((v, i) => (value[i] = scrubKeys(v, seen)));
    return value;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else {
      obj[key] = scrubKeys(obj[key], seen);
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

// ─── Public trial roast (no account) ─────────────────────────────────────────
//
// `POST /api/analysis/try` is the only unauthenticated endpoint that spends
// money, so it gets two independent brakes: one per visitor, one global.

/**
 * Exactly one free roast per IP per day.
 *
 * Keyed strictly on IP. There's no user to key on, and honouring any
 * client-supplied identifier (header, cookie, body field) would just hand the
 * caller a free way to reset their own bucket. A single token also makes a
 * separate burst limiter pointless — the second request of the day is already
 * refused.
 */
export const tryRoastRateLimiter = createRateLimiter({
  prefix: "rl:try-roast",
  tokens: 1,
  window: "86400 s",
  keyFn: (req: Request) => `ip:${ipKeyGenerator(req.ip ?? "")}`,
  message: "You've used your free roast for today. Sign in with Google for unlimited roasts.",
});

/**
 * Caps total spend across every caller, which the per-IP limits above cannot do
 * (a distributed script gets a fresh bucket per address). Override the ceiling
 * with TRY_ROAST_DAILY_BUDGET.
 */
export const tryRoastBudgetGuard = createDailyBudgetGuard({
  name: "try-roast",
  limit: Number(process.env.TRY_ROAST_DAILY_BUDGET ?? 200),
  message: "Free roasts are all claimed for today. Sign in with Google to roast now.",
});
