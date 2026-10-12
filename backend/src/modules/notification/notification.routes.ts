import { Router } from "express";
import * as controller from "./notification.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import { notificationRateLimiter } from "../../common/middleware/security.middleware.js";

const router = Router();

router.use(authenticate, notificationRateLimiter);

router.get("/", asyncHandler(controller.list));
router.get("/unread-count", asyncHandler(controller.unreadCount));
router.post("/read-all", asyncHandler(controller.markAllRead));
router.post("/:id/read", validateObjectIdParam("id"), asyncHandler(controller.markRead));
router.delete("/:id", validateObjectIdParam("id"), asyncHandler(controller.remove));

export default router;
