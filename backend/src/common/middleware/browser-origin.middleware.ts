import type { NextFunction, Request, Response } from "express";
import ApiError from "../utils/api-error.js";
import { isAllowedBrowserOrigin, originFromReferer } from "../config/origins.js";

/**
 * Requires the caller to present an `Origin` (or `Referer`) belonging to our own
 * frontend.
 *
 * Scope of protection: CORS is enforced by the *browser*, not the server, so a
 * `curl` or script call sails straight past it. Authenticated routes don't care
 * — they need a valid JWT. Public routes that spend money (AI calls) do care,
 * so this raises the cost of casual scripted abuse.
 *
 * This is deliberately one layer of several. Headers are trivially spoofable by
 * a determined attacker, which is why the endpoints using this are *also* behind
 * per-IP rate limits and a global daily budget ceiling. Treat it as a filter for
 * drive-by traffic, not as an authorization check.
 */
export const requireBrowserOrigin = (req: Request, _res: Response, next: NextFunction) => {
  const origin = req.get("origin") ?? originFromReferer(req.get("referer"));

  if (!origin || !isAllowedBrowserOrigin(origin)) {
    // Deliberately vague: don't tell a prober which header tripped the check.
    next(ApiError.forbidden("This endpoint is only available from the RoastForge app."));
    return;
  }

  next();
};
