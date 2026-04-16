import { Router } from "express";
import * as controller from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import { loginRateLimiter, refreshRateLimiter } from "../../common/middleware/security.middleware.js";
import RegisterDto from "./dto/register.dto.js";
import LoginDto from "./dto/login.dto.js";
import DeleteAccountDto from "./dto/delete-account.dto.js";
import UpdateProfileDto from "./dto/update-profile.dto.js";

const router = Router();

router.post("/register", validate(RegisterDto), asyncHandler(controller.register));
router.post("/login", loginRateLimiter, validate(LoginDto), asyncHandler(controller.login));
router.post("/refresh", refreshRateLimiter, asyncHandler(controller.refresh));
router.post("/logout", authenticate, asyncHandler(controller.logout));
router.get("/me", authenticate, asyncHandler(controller.getMe));
router.patch("/me/profile", authenticate, validate(UpdateProfileDto), asyncHandler(controller.updateProfile));
router.patch("/regenerate-username", authenticate, asyncHandler(controller.regenerateUsername));
router.delete("/account", authenticate, validate(DeleteAccountDto), asyncHandler(controller.deleteAccount));

export default router;
