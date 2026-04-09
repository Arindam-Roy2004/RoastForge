import mongoose from "mongoose";
import Project from "../project/project.model.js";
import Resume from "../resume/resume.model.js";
import Like from "../resume/like.model.js";
import Comment from "../comment/comment.model.js";
import CommentVote from "../comment/comment-vote.model.js";

async function collectDescendantCommentIds(parentId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> {
  const children = await Comment.find({ parentId }).select("_id").lean();
  const out: mongoose.Types.ObjectId[] = [];
  for (const ch of children) {
    const id = ch._id as mongoose.Types.ObjectId;
    out.push(id);
    out.push(...(await collectDescendantCommentIds(id)));
  }
  return out;
}

/**
 * Removes all app data tied to a user (projects, resumes, likes, comments, votes)
 * before the User document is deleted.
 */
export async function purgeUserData(userId: string): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);

  await Project.deleteMany({ userId: uid });

  await CommentVote.deleteMany({ userId: uid });
  await Like.deleteMany({ userId: uid });

  const myResumes = await Resume.find({ userId: uid }).select("_id").lean();
  const myResumeIds = myResumes.map((r) => r._id as mongoose.Types.ObjectId);

  if (myResumeIds.length > 0) {
    const commentsOnMine = await Comment.find({ resumeId: { $in: myResumeIds } }).select("_id").lean();
    const commentIdsOnMine = commentsOnMine.map((c) => c._id as mongoose.Types.ObjectId);
    if (commentIdsOnMine.length > 0) {
      await CommentVote.deleteMany({ commentId: { $in: commentIdsOnMine } });
    }
    await Comment.deleteMany({ resumeId: { $in: myResumeIds } });
    await Like.deleteMany({ resumeId: { $in: myResumeIds } });
    await Resume.deleteMany({ userId: uid });
  }

  const myTopOnOthers = await Comment.find({ userId: uid, parentId: null }).lean();
  for (const t of myTopOnOthers) {
    const tid = t._id as mongoose.Types.ObjectId;
    const descendants = await collectDescendantCommentIds(tid);
    const allIds = [tid, ...descendants];
    await CommentVote.deleteMany({ commentId: { $in: allIds } });
    await Comment.deleteMany({ _id: { $in: allIds } });
    await Resume.findByIdAndUpdate(t.resumeId, { $inc: { commentsCount: -1 } });
  }

  const remainingByUser = await Comment.find({ userId: uid }).select("_id").lean();
  const remainingIds = remainingByUser.map((c) => c._id as mongoose.Types.ObjectId);
  if (remainingIds.length > 0) {
    await CommentVote.deleteMany({ commentId: { $in: remainingIds } });
  }
  await Comment.deleteMany({ userId: uid });
}
