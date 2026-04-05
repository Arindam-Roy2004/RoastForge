import Comment from "./comment.model.js";
import CommentVote from "./comment-vote.model.js";
import Resume from "../resume/resume.model.js";
import ApiError from "../../common/utils/api-error.js";

const populateUser = (q: any) => q.populate("userId", "name avatar");

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

  // Delete replies too if it's a top-level comment
  if (!comment.parentId) {
    await Comment.deleteMany({ parentId: commentId });
    await Resume.findByIdAndUpdate(comment.resumeId, { $inc: { commentsCount: -1 } });
  }

  await comment.deleteOne();
  await CommentVote.deleteMany({ commentId });
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
  const existing = await CommentVote.findOne({ commentId, userId });

  if (!existing) {
    await CommentVote.create({ commentId, userId, voteType });
    await Comment.findByIdAndUpdate(commentId, {
      $inc: voteType === "upvote" ? { upvotesCount: 1 } : { downvotesCount: 1 },
    });
    return { action: "added", voteType };
  }

  if (existing.voteType === voteType) {
    // Remove vote (toggle off)
    await existing.deleteOne();
    await Comment.findByIdAndUpdate(commentId, {
      $inc: voteType === "upvote" ? { upvotesCount: -1 } : { downvotesCount: -1 },
    });
    return { action: "removed", voteType };
  }

  // Switch vote direction
  const oldType = existing.voteType;
  existing.voteType = voteType;
  await existing.save();
  await Comment.findByIdAndUpdate(commentId, {
    $inc: {
      upvotesCount: oldType === "upvote" ? -1 : 1,
      downvotesCount: oldType === "downvote" ? -1 : 1,
    },
  });
  return { action: "switched", voteType };
};
