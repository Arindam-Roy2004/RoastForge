import { Router } from "express";
import * as controller from "./comment.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import { validateObjectIdParam } from "../../common/middleware/validate-object-id.middleware.js";
import { writeRateLimiter, reactionRateLimiter, publicReadRateLimiter } from "../../common/middleware/security.middleware.js";
import CommentBodyDto from "./dto/comment-body.dto.js";
import VoteDto from "./dto/vote.dto.js";

const router = Router();

// Comments under a resume
router.get("/resume/:resumeId", validateObjectIdParam("resumeId"), publicReadRateLimiter, asyncHandler(controller.getComments));
router.post("/resume/:resumeId", validateObjectIdParam("resumeId"), authenticate, writeRateLimiter, validate(CommentBodyDto), asyncHandler(controller.addComment));

// Comment actions
router.put("/:id", validateObjectIdParam("id"), authenticate, writeRateLimiter, validate(CommentBodyDto), asyncHandler(controller.updateComment));
router.delete("/:id", validateObjectIdParam("id"), authenticate, writeRateLimiter, asyncHandler(controller.deleteComment));
router.post("/:id/replies", validateObjectIdParam("id"), authenticate, writeRateLimiter, validate(CommentBodyDto), asyncHandler(controller.addReply));
router.post("/:id/vote", validateObjectIdParam("id"), authenticate, reactionRateLimiter, validate(VoteDto), asyncHandler(controller.voteComment));

export default router;
