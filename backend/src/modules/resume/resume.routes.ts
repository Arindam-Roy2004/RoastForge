import { Router } from "express";
import * as controller from "./resume.controller.js";
import { authenticate, optionalAuth } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import CreateResumeDto from "./dto/create-resume.dto.js";
import UpdateResumeDto from "./dto/update-resume.dto.js";

const router = Router();

// Public with optional auth (to show liked status)
router.get("/", optionalAuth, asyncHandler(controller.listResumes));
router.get("/my", authenticate, asyncHandler(controller.getMyResumes));
router.get("/:id", optionalAuth, asyncHandler(controller.getResume));

// Protected
router.post("/", authenticate, validate(CreateResumeDto), asyncHandler(controller.createResume));
router.put("/:id", authenticate, validate(UpdateResumeDto), asyncHandler(controller.updateResume));
router.delete("/:id", authenticate, asyncHandler(controller.deleteResume));
router.post("/:id/like", authenticate, asyncHandler(controller.toggleLike));

export default router;
