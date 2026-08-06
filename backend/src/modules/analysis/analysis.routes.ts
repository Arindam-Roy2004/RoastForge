import { Router } from "express";
import { analyzeResume, detectPii, tryRoast } from "./analysis.controller.js";
import { authenticate, requireCandidate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import {
  analysisRateLimiter,
  piiDetectRateLimiter,
  tryRoastBudgetGuard,
  tryRoastRateLimiter,
} from "../../common/middleware/security.middleware.js";
import { requireBrowserOrigin } from "../../common/middleware/browser-origin.middleware.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import DetectPiiDto from "./dto/detect-pii.dto.js";
import TryRoastDto from "./dto/try-roast.dto.js";

const router = Router();

// POST /api/analysis/detect-pii — find personal info in resume text (upload-flow editor).
// Declared before "/:id" so the literal path isn't captured as an :id param.
router.post("/detect-pii", authenticate, requireCandidate, piiDetectRateLimiter, validate(DetectPiiDto), asyncHandler(detectPii));

// POST /api/analysis/try — one free roast per visitor, no account needed.
//
// The only unauthenticated endpoint that spends money. Guard order matters:
//   1. requireBrowserOrigin — drop scripted callers that aren't our frontend
//   2. validate             — cheap, and must run BEFORE the limiter so a
//                             malformed body doesn't burn the visitor's single
//                             daily roast on a request that was never going to
//                             reach the model
//   3. rate limiter         — one roast per IP per day
//   4. budget guard         — global daily ceiling, counted last so it only
//                             tracks requests that actually reach the model
router.post(
  "/try",
  requireBrowserOrigin,
  validate(TryRoastDto),
  tryRoastRateLimiter,
  tryRoastBudgetGuard,
  asyncHandler(tryRoast),
);

// POST /api/analysis/:id — trigger AI roast for a resume
router.post("/:id", authenticate, analysisRateLimiter, validateObjectIdParam("id"), asyncHandler(analyzeResume));

export default router;
