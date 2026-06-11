import { Router } from "express";
import * as controller from "./project.controller.js";
import { authenticate, requireCandidate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import { writeRateLimiter } from "../../common/middleware/security.middleware.js";
import CreateProjectDto from "./dto/create-project.dto.js";

const router = Router();

router.get("/", authenticate, requireCandidate, asyncHandler(controller.listProjects));
router.post("/", authenticate, requireCandidate, writeRateLimiter, validate(CreateProjectDto), asyncHandler(controller.createProject));
router.delete("/:id", validateObjectIdParam("id"), authenticate, requireCandidate, writeRateLimiter, asyncHandler(controller.deleteProject));

export default router;
