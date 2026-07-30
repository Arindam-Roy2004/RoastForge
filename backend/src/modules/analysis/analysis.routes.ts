import { Router } from "express";
import { analyzeResume } from "./analysis.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { analysisRateLimiter } from "../../common/middleware/security.middleware.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";

const router = Router();

// POST /api/analysis/:id — trigger AI roast for a resume
router.post("/:id", authenticate, analysisRateLimiter, validateObjectIdParam("id"), asyncHandler(analyzeResume));

export default router;
