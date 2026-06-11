import { Router } from "express";
import * as controller from "./recruiter.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import { recruiterRateLimiter } from "../../common/middleware/security.middleware.js";

const router = Router();

router.get("/candidates", authenticate, recruiterRateLimiter, asyncHandler(controller.searchCandidates));
router.get("/candidate/:userId/profile", validateObjectIdParam("userId"), authenticate, recruiterRateLimiter, asyncHandler(controller.getCandidateProfile));

export default router;
