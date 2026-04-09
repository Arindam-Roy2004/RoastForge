import { Router } from "express";
import * as controller from "./project.controller.js";
import { authenticate, requireCandidate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import CreateProjectDto from "./dto/create-project.dto.js";

const router = Router();

router.get("/", authenticate, requireCandidate, asyncHandler(controller.listProjects));
router.post("/", authenticate, requireCandidate, validate(CreateProjectDto), asyncHandler(controller.createProject));
router.delete("/:id", authenticate, requireCandidate, asyncHandler(controller.deleteProject));

export default router;
