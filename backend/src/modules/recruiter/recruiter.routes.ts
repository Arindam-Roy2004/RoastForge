import { Router } from "express";
import * as controller from "./recruiter.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";

const router = Router();

router.get("/candidates", authenticate, asyncHandler(controller.searchCandidates));
router.get("/candidate/:userId/profile", authenticate, asyncHandler(controller.getCandidateProfile));

export default router;
