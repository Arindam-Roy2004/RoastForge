import { Router } from "express";
import { analyzeResume, detectPii } from "./analysis.controller.js";
import { authenticate, requireCandidate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { analysisRateLimiter, piiDetectRateLimiter } from "../../common/middleware/security.middleware.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import validate from "../../common/middleware/validate.middleware.js";
import DetectPiiDto from "./dto/detect-pii.dto.js";

const router = Router();

// POST /api/analysis/detect-pii — find personal info in resume text (upload-flow editor).
// Declared before "/:id" so the literal path isn't captured as an :id param.
router.post("/detect-pii", authenticate, requireCandidate, piiDetectRateLimiter, validate(DetectPiiDto), asyncHandler(detectPii));

// POST /api/analysis/:id — trigger AI roast for a resume
router.post("/:id", authenticate, analysisRateLimiter, validateObjectIdParam("id"), asyncHandler(analyzeResume));

export default router;
