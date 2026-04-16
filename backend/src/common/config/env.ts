/**
 * Fail-fast assertion that all required environment variables are present and
 * non-trivial. Called from both server.ts (long-running) and the serverless entry
 * so misconfiguration is caught at boot rather than on the first request.
 */
const REQUIRED = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const;
const MIN_SECRET_LEN = 16;

let asserted = false;

export function assertEnv(): void {
  if (asserted) return;
  const missing: string[] = [];
  const weak: string[] = [];

  for (const key of REQUIRED) {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
    } else if (value.length < MIN_SECRET_LEN) {
      weak.push(key);
    }
  }

  const errors: string[] = [];
  if (missing.length) errors.push(`Missing required env: ${missing.join(", ")}`);
  if (weak.length) errors.push(`Weak secrets (need >= ${MIN_SECRET_LEN} chars): ${weak.join(", ")}`);

  if (errors.length) {
    throw new Error(errors.join(". "));
  }
  asserted = true;
}
