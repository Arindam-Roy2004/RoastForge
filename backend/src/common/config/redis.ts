import { Redis } from "@upstash/redis";

/**
 * Upstash client for the roast cache.
 *
 * Failure policy differs per call site, by design:
 *  - rate-limit.ts   → fails open (a Redis blip shouldn't become an outage)
 *  - daily-budget.ts → fails closed (if it can't count spend, it can't cap it)
 *  - this module     → fails open (a cache is an optimisation, not a dependency)
 *
 * Built lazily and only when credentials exist. The SDK doesn't throw on a
 * missing url/token — it warns and then fails on every command, so an eager
 * client turns "Upstash not configured" into a 500 on the roast endpoint.
 */

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

let client: Redis | null = null;

/** Shared client, or null when Upstash isn't configured. */
export function getRedis(): Redis | null {
  if (!hasUpstash) return null;
  if (client) return client;
  client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return client;
}

function warn(message: string, err: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(message, err);
  }
}

/** Cache read that degrades to a miss — an error and a miss both mean recompute. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (err) {
    warn(`Cache read failed for ${key}, treating as miss:`, err);
    return null;
  }
}

/** Cache write that never throws — the value is already computed and sent. */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    warn(`Cache write failed for ${key}, continuing:`, err);
  }
}
