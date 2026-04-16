import { Router } from "express";
import * as controller from "./auth.controller.js";
import { authenticate } from "./auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import { refreshRateLimiter, googleAuthRateLimiter } from "../../common/middleware/security.middleware.js";
import GoogleLoginDto from "./dto/google-login.dto.js";
import CompleteOnboardingDto from "./dto/complete-onboarding.dto.js";
import DeleteAccountDto from "./dto/delete-account.dto.js";
import UpdateProfileDto from "./dto/update-profile.dto.js";

const router = Router();

router.post("/google", googleAuthRateLimiter, validate(GoogleLoginDto), asyncHandler(controller.google));
router.post("/refresh", refreshRateLimiter, asyncHandler(controller.refresh));
router.post("/logout", authenticate, asyncHandler(controller.logout));
router.get("/me", authenticate, asyncHandler(controller.getMe));
router.patch("/me/profile", authenticate, validate(UpdateProfileDto), asyncHandler(controller.updateProfile));
router.post("/me/complete-onboarding", authenticate, validate(CompleteOnboardingDto), asyncHandler(controller.completeOnboarding));
router.patch("/regenerate-username", authenticate, asyncHandler(controller.regenerateUsername));
router.delete("/account", authenticate, validate(DeleteAccountDto), asyncHandler(controller.deleteAccount));

export default router;
