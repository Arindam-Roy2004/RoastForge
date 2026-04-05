import * as commentService from "./comment.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response } from "express";

const p = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);
import ApiError from "../../common/utils/api-error.js";

export const getComments = async (req: Request, res: Response) => {
  const comments = await commentService.getComments(p(req.params.resumeId));
  ApiResponse.ok(res, "Comments fetched", comments);
};

export const addComment = async (req: Request, res: Response) => {
  const { text, parentId } = req.body;
  if (!text?.trim()) throw ApiError.badRequest("Comment text is required");
  const comment = await commentService.addComment(
    p(req.params.resumeId),
    (req as any).user.id,
    text,
    parentId || null,
  );
  ApiResponse.created(res, "Comment added", comment);
};

export const updateComment = async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text?.trim()) throw ApiError.badRequest("Comment text is required");
  const comment = await commentService.updateComment(
    p(req.params.id),
    (req as any).user.id,
    text,
  );
  ApiResponse.ok(res, "Comment updated", comment);
};

export const deleteComment = async (req: Request, res: Response) => {
  await commentService.deleteComment(p(req.params.id), (req as any).user.id);
  ApiResponse.ok(res, "Comment deleted");
};

export const addReply = async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text?.trim()) throw ApiError.badRequest("Reply text is required");
  const reply = await commentService.addReply(p(req.params.id), (req as any).user.id, text);
  ApiResponse.created(res, "Reply added", reply);
};

export const voteComment = async (req: Request, res: Response) => {
  const { voteType } = req.body;
  if (voteType !== "upvote" && voteType !== "downvote") {
    throw ApiError.badRequest("voteType must be 'upvote' or 'downvote'");
  }
  const result = await commentService.voteComment(p(req.params.id), (req as any).user.id, voteType);
  ApiResponse.ok(res, "Vote recorded", result);
};
