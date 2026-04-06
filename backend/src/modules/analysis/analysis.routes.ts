import { Router } from "express";
import { analyzeResume } from "./analysis.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";

const router = Router();

// POST /api/analysis/:id — trigger AI roast for a resume
router.post("/:id", authenticate, asyncHandler(analyzeResume));

export default router;
