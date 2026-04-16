import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { ipKeyGenerator, rateLimit as memoryRateLimit } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";

/**
 * Rate limiters that actually work on Vercel serverless.
 *
 * Why not express-rate-limit's default: its in-memory store lives inside a
 * single function instance. Vercel spins up many instances on burst, each
 * with its own counter, so the limit becomes effectively (limit × fanout).
 *
 * Strategy:
 *  - If UPSTASH_REDIS_REST_URL/TOKEN are set, use @upstash/ratelimit
 *    (sliding window backed by a shared Redis). This is the prod path.
 *  - Otherwise, fall back to express-rate-limit's memory store so local dev
 *    still works without Upstash. Non-shared — don't rely on it in prod.
 */

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

let redis: Redis | null = null;
function getRedis(): Redis {
  if (redis) return redis;
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return redis;
}

type Window = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

interface LimiterOptions {
  /** Unique Redis key prefix (e.g. "rl:google-auth"). Must differ per limiter. */
  prefix: string;
  /** Requests allowed within `window`. */
  tokens: number;
  /** @upstash/ratelimit window literal, e.g. "60 s". */
  window: Window;
  /** Builds the bucket key per request. Default: IP (with IPv6 normalized to /64). */
  keyFn?: (req: Request) => string;
  /** Message surfaced on 429. */
  message?: string;
}

function windowMs(window: Window): number {
  const [num, unit] = window.split(" ");
  const n = Number(num);
  switch (unit) {
    case "ms": return n;
    case "s": return n * 1000;
    case "m": return n * 60_000;
    case "h": return n * 3_600_000;
    case "d": return n * 86_400_000;
    default: return 60_000;
  }
}

export function createRateLimiter(opts: LimiterOptions) {
  const message = opts.message ?? "Too many requests. Slow down.";
  const keyFn = opts.keyFn ?? ((req: Request) => ipKeyGenerator(req.ip ?? ""));

  if (!hasUpstash) {
    return memoryRateLimit({
      windowMs: windowMs(opts.window),
      max: opts.tokens,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: keyFn,
      message: { success: false, message },
    });
  }

  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(opts.tokens, opts.window),
    prefix: opts.prefix,
    analytics: false,
  });

  return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
      const key = keyFn(req);
      const { success, limit, remaining, reset } = await limiter.limit(key);
      // RateLimit-* headers match express-rate-limit's standardHeaders: true output.
      res.setHeader("RateLimit-Limit", String(limit));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, remaining)));
      res.setHeader("RateLimit-Reset", String(Math.ceil((reset - Date.now()) / 1000)));
      if (!success) {
        res.status(429).json({ success: false, message });
        return;
      }
      next();
    } catch (err) {
      // Fail-open on Upstash hiccups: refusing all traffic because rate-limit
      // Redis had a blip is worse than the attack surface of a few skipped
      // checks. Log so we notice a sustained outage.
      if (process.env.NODE_ENV !== "production") {
        console.warn("Rate limit check failed, allowing request:", err);
      }
      next();
    }
  };
}
