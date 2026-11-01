import { Router } from "express";
import * as controller from "./admin.controller.js";
import { authenticate, requireAdmin } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import { adminRateLimiter } from "../../common/middleware/security.middleware.js";
import UpdateUserDto from "./dto/update-user.dto.js";
import DeleteUserDto from "./dto/delete-user.dto.js";

const router = Router();

// Gate the whole router: nothing below is reachable without a live admin session.
router.use(authenticate, requireAdmin, adminRateLimiter);

router.get("/overview", asyncHandler(controller.overview));

router.get("/users", asyncHandler(controller.listUsers));
router.get("/users/:userId", validateObjectIdParam("userId"), asyncHandler(controller.getUser));
router.patch("/users/:userId", validateObjectIdParam("userId"), validate(UpdateUserDto), asyncHandler(controller.updateUser));
router.delete("/users/:userId", validateObjectIdParam("userId"), validate(DeleteUserDto), asyncHandler(controller.deleteUser));

router.get("/resumes", asyncHandler(controller.listResumes));
router.delete("/resumes/:resumeId", validateObjectIdParam("resumeId"), asyncHandler(controller.deleteResume));

router.get("/comments", asyncHandler(controller.listComments));
router.delete("/comments/:commentId", validateObjectIdParam("commentId"), asyncHandler(controller.deleteComment));

export default router;
