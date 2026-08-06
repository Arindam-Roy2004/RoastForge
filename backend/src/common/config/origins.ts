/**
 * Single source of truth for which browser origins we trust.
 *
 * Used by two different guards that must never disagree:
 *  - the CORS layer in `app.ts` (decides which origins get a response)
 *  - `requireBrowserOrigin` (rejects non-browser callers on public endpoints)
 */

/** Comma-separated FRONTEND_ORIGIN (e.g. prod + previews). Required on Vercel for split deploys. */
export function allowedBrowserOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

// Every Vercel PR preview gets a unique hostname (e.g. `frontend-git-feat-x-user.vercel.app`),
// so exact-match CORS would reject them. Opt-in via ALLOW_VERCEL_PREVIEWS=true so we don't
// accidentally trust previews in environments where they shouldn't be allowed.
const VERCEL_PREVIEW_RE = /^https:\/\/[\w-]+\.vercel\.app$/;

export function isAllowedBrowserOrigin(origin: string): boolean {
  if (allowedBrowserOrigins().includes(origin)) return true;
  if (process.env.ALLOW_VERCEL_PREVIEWS === "true" && VERCEL_PREVIEW_RE.test(origin)) return true;
  return false;
}

/**
 * Normalises a `Referer` header down to its origin so it can be compared
 * against the allowlist. Returns null when the header is absent or malformed.
 */
export function originFromReferer(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}
