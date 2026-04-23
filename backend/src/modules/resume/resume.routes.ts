import { Router } from "express";
import * as controller from "./resume.controller.js";
import { authenticate, optionalAuth, requireCandidate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import CreateResumeDto from "./dto/create-resume.dto.js";
import UpdateResumeDto from "./dto/update-resume.dto.js";

const router = Router();

// Public with optional auth (to show liked status)
router.get("/", optionalAuth, asyncHandler(controller.listResumes));
router.get("/my", authenticate, asyncHandler(controller.getMyResumes));
router.get("/:id", validateObjectIdParam("id"), optionalAuth, asyncHandler(controller.getResume));

// Protected
router.post("/", authenticate, requireCandidate, validate(CreateResumeDto), asyncHandler(controller.createResume));
router.put("/:id", validateObjectIdParam("id"), authenticate, requireCandidate, validate(UpdateResumeDto), asyncHandler(controller.updateResume));
router.delete("/:id", validateObjectIdParam("id"), authenticate, requireCandidate, asyncHandler(controller.deleteResume));
router.post("/:id/like", validateObjectIdParam("id"), authenticate, asyncHandler(controller.toggleLike));
router.post("/:id/reaction", validateObjectIdParam("id"), authenticate, asyncHandler(controller.reactToResume));

export default router;
