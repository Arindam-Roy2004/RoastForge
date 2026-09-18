import jwt from "jsonwebtoken";
import ApiError from "../../common/utils/api-error.js";
import { verifyAccessToken } from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

/**
 * Everything attached to `req.user`. Deliberately minimal: `id` and `role` are
 * the only fields any consumer actually reads (upload.routes, requireCandidate,
 * the rate-limit key function), and the rest are kept because responses have
 * historically echoed them.
 */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

/**
 * Projection for the identity lookup.
 *
 * This query runs on every authenticated request, and on public feed reads too
 * whenever the browser happens to send a token, which makes it the hottest
 * query in the app. Without an explicit projection it drags back
 * `publicProfile`, `talentMetrics` and the seven avatar-preference fields only
 * for them to be dropped on the next line. `password`, `googleId` and
 * `refreshToken` are already `select: false` on the schema; naming fields here
 * means a future sensitive field is excluded by default rather than by
 * remembering to opt it out.
 */
const AUTH_PROJECTION = "name email avatar role";

/**
 * Outcome of resolving an Authorization header, kept as a tagged union so each
 * middleware applies its own policy.
 *
 * `authenticate` rejects "absent" and "deleted" with different messages;
 * `optionalAuth` treats both as anonymous. Collapsing them into a single
 * nullable return would force one of those behaviours onto the other — in
 * particular it would start 401ing anonymous browsing for anyone holding a
 * still-valid token for a since-deleted account.
 */
type BearerResolution =
  | { status: "absent" }
  | { status: "deleted" }
  | { status: "ok"; user: AuthenticatedUser };

/**
 * Verifies a Bearer token and loads the matching identity.
 *
 * Throws `jwt.JsonWebTokenError` for a malformed or expired token. That is
 * intentional: the two callers disagree on whether a bad token is fatal, so the
 * decision belongs to them, not here.
 */
async function resolveBearerUser(header: unknown): Promise<BearerResolution> {
  if (typeof header !== "string" || !header.startsWith("Bearer ")) {
    return { status: "absent" };
  }

  const token = header.slice("Bearer ".length).trim();
  // A bare "Bearer" (or "Bearer   ") is a missing credential, not an invalid
  // one — verifying "" would surface as JsonWebTokenError and report the wrong
  // reason to the client.
  if (token.length === 0) return { status: "absent" };

  const { id } = verifyAccessToken(token) as { id: string };

  // .lean(): this document is read-only and discarded after the mapping below,
  // so Mongoose hydration would be pure overhead on the hottest query path.
  const user = await User.findById(id).select(AUTH_PROJECTION).lean();
  if (!user) return { status: "deleted" };

  return {
    status: "ok",
    user: {
      id: String(user._id),
      name: user.name ?? "",
      email: user.email ?? "",
      avatar: user.avatar ?? "",
      role: user.role ?? "user",
    },
  };
}

/** Resumes upload, projects, and candidate resume APIs only. */
export const requireCandidate = (req: any, res: any, next: any) => {
  if (req.user?.role === "recruiter") {
    return next(ApiError.forbidden("Recruiter accounts cannot use this action."));
  }
  next();
};

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const resolved = await resolveBearerUser(req.headers.authorization);
    if (resolved.status === "absent") throw ApiError.unauthorized("Not authenticated");
    if (resolved.status === "deleted") throw ApiError.unauthorized("User no longer exists");
    req.user = resolved.user;
    next();
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      next(ApiError.unauthorized("Invalid or expired token"));
      return;
    }
    next(e);
  }
};

// Optional auth — attaches user if a valid token is provided. Bad / expired
// tokens are silently ignored so anonymous browsing still works, but database
// or unexpected errors must propagate.
export const optionalAuth = async (req: any, _res: any, next: any) => {
  try {
    const resolved = await resolveBearerUser(req.headers.authorization);
    if (resolved.status === "ok") req.user = resolved.user;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("optionalAuth: ignoring invalid token", err.message);
      }
      next();
      return;
    }
    next(err);
  }
};
