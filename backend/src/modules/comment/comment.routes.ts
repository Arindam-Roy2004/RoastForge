import { Router } from "express";
import * as controller from "./comment.controller.js";
import { authenticate } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import CommentBodyDto from "./dto/comment-body.dto.js";
import VoteDto from "./dto/vote.dto.js";

const router = Router();

// Comments under a resume
router.get("/resume/:resumeId", asyncHandler(controller.getComments));
router.post("/resume/:resumeId", authenticate, validate(CommentBodyDto), asyncHandler(controller.addComment));

// Comment actions
router.put("/:id", authenticate, validate(CommentBodyDto), asyncHandler(controller.updateComment));
router.delete("/:id", authenticate, asyncHandler(controller.deleteComment));
router.post("/:id/replies", authenticate, validate(CommentBodyDto), asyncHandler(controller.addReply));
router.post("/:id/vote", authenticate, validate(VoteDto), asyncHandler(controller.voteComment));

export default router;
