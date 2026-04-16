import mongoose from "mongoose";
import Comment, { TOMBSTONE_TEXT } from "./comment.model.js";
import CommentVote from "./comment-vote.model.js";
import Resume from "../resume/resume.model.js";
import ApiError from "../../common/utils/api-error.js";
import { collectCommentSubtreeIds, subtreeContainsOtherAuthor } from "./comment-tree.util.js";

const populateUser = (q: any) => q.populate("userId", "name avatar anonymousUsername");

export const getComments = async (resumeId: string) => {
  // Get all top-level comments (no parent)
  const topLevel = await populateUser(
    Comment.find({ resumeId, parentId: null }).sort({ createdAt: -1 })
  );

  // Get all replies
  const topLevelIds = topLevel.map((c: any) => c._id);
  const replies = await populateUser(
    Comment.find({ resumeId, parentId: { $in: topLevelIds } }).sort({ createdAt: 1 })
  );

  // Nest replies under their parent
  const replyMap = new Map<string, any[]>();
  for (const r of replies) {
    const key = r.parentId.toString();
    if (!replyMap.has(key)) replyMap.set(key, []);
    replyMap.get(key)!.push(r.toObject());
  }

  return topLevel.map((c: any) => ({
    ...c.toObject(),
    replies: replyMap.get(c._id.toString()) || [],
  }));
};

export const addComment = async (resumeId: string, userId: string, text: string, parentId?: string | null) => {
  if (parentId) {
    // Prevent cross-resume thread injection: the parent must belong to this resume.
    const parent = await Comment.findById(parentId).select("resumeId").lean();
    if (!parent) throw ApiError.notfound("Parent comment not found");
    if (parent.resumeId.toString() !== resumeId) {
      throw ApiError.badRequest("Parent comment does not belong to this resume");
    }
  }

  const comment = await Comment.create({
    resumeId,
    userId,
    text: text.trim(),
    parentId: parentId || null,
  });

  // Only increment count for top-level comments
  if (!parentId) {
    await Resume.findByIdAndUpdate(resumeId, { $inc: { commentsCount: 1 } });
  }

  return populateUser(Comment.findById(comment._id));
};

export const updateComment = async (commentId: string, userId: string, text: string) => {
  const comment = await Comment.findOne({ _id: commentId, userId });
  if (!comment) throw ApiError.notfound("Comment not found or not yours");
  comment.text = text.trim();
  await comment.save();
  return comment;
};

export const deleteComment = async (commentId: string, userId: string) => {
  const comment = await Comment.findOne({ _id: commentId, userId });
  if (!comment) throw ApiError.notfound("Comment not found or not yours");

  const rootId = comment._id as mongoose.Types.ObjectId;
  const authorId = new mongoose.Types.ObjectId(userId);

  // If other users have replied underneath, destroying this node would silently
  // delete their contributions. Tombstone instead so the thread structure survives.
  if (await subtreeContainsOtherAuthor(rootId, authorId)) {
    await Comment.updateOne(
      { _id: rootId },
      { $set: { userId: null, text: TOMBSTONE_TEXT } },
    );
    // Leave votes on this node untouched — they were cast by other users on the
    // original roast and still belong to the now-tombstoned entry in the thread.
    return;
  }

  // Pure-author subtree (no one else has contributed) — safe to hard-delete.
  const subtreeIds = await collectCommentSubtreeIds(rootId);
  if (subtreeIds.length > 0) {
    await CommentVote.deleteMany({ commentId: { $in: subtreeIds } });
    await Comment.deleteMany({ _id: { $in: subtreeIds } });
  }

  // Only top-level removals decrement the resume's visible comment count;
  // tombstones don't decrement because the node is still present.
  if (!comment.parentId) {
    await Resume.findByIdAndUpdate(comment.resumeId, { $inc: { commentsCount: -1 } });
  }
};

export const addReply = async (parentCommentId: string, userId: string, text: string) => {
  const parent = await Comment.findById(parentCommentId);
  if (!parent) throw ApiError.notfound("Parent comment not found");

  const reply = await Comment.create({
    resumeId: parent.resumeId,
    userId,
    text: text.trim(),
    parentId: parentCommentId,
  });

  return populateUser(Comment.findById(reply._id));
};

export const voteComment = async (commentId: string, userId: string, voteType: "upvote" | "downvote") => {
  // findOneAndUpdate with upsert makes the "add / switch" path atomic.
  const prior = await CommentVote.findOneAndUpdate(
    { commentId, userId },
    { $set: { voteType } },
    { upsert: true, returnDocument: "before" },
  );

  if (!prior) {
    // No previous vote: pure addition.
    await Comment.findByIdAndUpdate(commentId, {
      $inc: voteType === "upvote" ? { upvotesCount: 1 } : { downvotesCount: 1 },
    });
    return { action: "added", voteType };
  }

  if (prior.voteType === voteType) {
    // Same direction: toggle off by deleting. A racing duplicate request has already
    // moved on, so treat a missing row as idempotent.
    const deleted = await CommentVote.findOneAndDelete({ commentId, userId });
    if (deleted) {
      await Comment.findByIdAndUpdate(commentId, {
        $inc: voteType === "upvote" ? { upvotesCount: -1 } : { downvotesCount: -1 },
      });
    }
    return { action: "removed", voteType };
  }

  // Switched direction.
  await Comment.findByIdAndUpdate(commentId, {
    $inc: {
      upvotesCount: prior.voteType === "upvote" ? -1 : 1,
      downvotesCount: prior.voteType === "downvote" ? -1 : 1,
    },
  });
  return { action: "switched", voteType };
};
