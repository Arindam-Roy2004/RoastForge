/**
 * Resolves Express's `trust proxy` setting from TRUST_PROXY.
 *
 * Security-relevant: every IP-keyed rate limiter reads `req.ip`, which is only
 * trustworthy when the hop count matches the real proxy chain. Too high and a
 * client can forge an IP via X-Forwarded-For; too low and all callers collapse
 * into one bucket.
 *
 * Default 1 — correct for Vercel and for the VPS, where Nginx is the only hop.
 */
export function resolveTrustProxy(): number | boolean | string {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return 1;
  if (raw === "true") return true;
  if (raw === "false") return false;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}
