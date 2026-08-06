import { Redis } from "@upstash/redis";
import type { NextFunction, Request, Response } from "express";
import ApiResponse from "../utils/api-response.js";

/**
 * A shared, global daily ceiling for endpoints that cost real money per call.
 *
 * Why this exists on top of rate limiting: per-IP limits stop *one* abuser.
 * They do nothing about a distributed script where every request arrives from a
 * fresh address — each IP stays under its own limit while the Gemini bill runs
 * away. This guard counts every call to a named endpoint against one counter
 * that rolls over at UTC midnight, so the worst-case daily spend is bounded no
 * matter how many addresses show up.
 *
 * Storage mirrors `rate-limit.ts`: Upstash when configured (shared across all
 * serverless instances), in-process otherwise so local dev works.
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

interface BudgetOptions {
  /** Unique counter name (e.g. "try-roast"). Must differ per guarded endpoint. */
  name: string;
  /** Max calls allowed across all callers per UTC day. */
  limit: number;
  /** Message surfaced once the ceiling is hit. */
  message?: string;
}

/** UTC day stamp, so the window is identical for every serverless instance. */
function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seconds remaining until the counter rolls over, used as the key's TTL. */
function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(60, Math.ceil((midnight - now.getTime()) / 1000));
}

/** Dev-only fallback counter. Per-instance, so never rely on it in production. */
const memoryCounters = new Map<string, number>();

export function createDailyBudgetGuard(opts: BudgetOptions) {
  const message =
    opts.message ?? "Today's free quota is used up. Sign in to keep going.";

  return async function dailyBudgetGuard(req: Request, res: Response, next: NextFunction) {
    const key = `budget:${opts.name}:${utcDayKey()}`;

    if (!hasUpstash) {
      const used = (memoryCounters.get(key) ?? 0) + 1;
      memoryCounters.set(key, used);
      if (used > opts.limit) {
        ApiResponse.error(res, message, 429);
        return;
      }
      next();
      return;
    }

    try {
      const used = await getRedis().incr(key);
      // Set the TTL on first increment so the key can't outlive its day.
      if (used === 1) await getRedis().expire(key, secondsUntilUtcMidnight());

      if (used > opts.limit) {
        ApiResponse.error(res, message, 429);
        return;
      }
      next();
    } catch (err) {
      // Fail CLOSED, unlike the rate limiter. This guard's entire job is
      // capping spend on an unauthenticated endpoint; if we can't count, we
      // can't cap, and an open door here costs money. Signed-in users are
      // unaffected, so the blast radius of a Redis outage is limited to the
      // free trial being briefly unavailable — a good trade.
      if (process.env.NODE_ENV !== "production") {
        console.warn(`Daily budget check failed for ${opts.name}, denying:`, err);
      }
      ApiResponse.error(res, "Free roasts are temporarily unavailable. Sign in to continue.", 503);
    }
  };
}
