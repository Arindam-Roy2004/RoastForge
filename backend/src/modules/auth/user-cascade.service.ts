import mongoose from "mongoose";
import Project from "../project/project.model.js";
import Resume from "../resume/resume.model.js";
import Like from "../resume/like.model.js";
import Comment, { TOMBSTONE_TEXT } from "../comment/comment.model.js";
import CommentVote from "../comment/comment-vote.model.js";
import { collectCommentSubtreeIds, subtreeContainsOtherAuthor } from "../comment/comment-tree.util.js";

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

  // All comments still authored by this user now live on OTHER users' resumes
  // (the ones on their own resumes were purged above along with the resumes).
  //
  // Decision per comment:
  //   - Pure-author subtree (no one else replied anywhere underneath) → hard-delete
  //     the whole subtree. Nothing of value is lost.
  //   - Mixed subtree (another user replied somewhere below) → tombstone THIS node
  //     so other users' replies remain legible and correctly parented. We only null
  //     out the author's identity + text on the node they authored.
  const mineOnOthers = await Comment.find({ userId: uid })
    .select("_id parentId resumeId")
    .lean();

  const toTombstone: mongoose.Types.ObjectId[] = [];
  const toDelete = new Set<string>();
  const topLevelDeleteCandidates: { id: string; resumeId: string }[] = [];

  for (const c of mineOnOthers) {
    const cid = c._id as mongoose.Types.ObjectId;
    if (await subtreeContainsOtherAuthor(cid, uid)) {
      toTombstone.push(cid);
    } else {
      const subtree = await collectCommentSubtreeIds(cid);
      for (const id of subtree) toDelete.add(id.toString());
      if (!c.parentId) {
        // Track for commentsCount decrement; we confirm below that the id wasn't
        // pruned from `toDelete` by some other iteration (it won't be, but it's cheap
        // to verify and keeps the invariant explicit).
        topLevelDeleteCandidates.push({ id: cid.toString(), resumeId: c.resumeId.toString() });
      }
    }
  }

  if (toDelete.size > 0) {
    const deleteIds = Array.from(toDelete).map((s) => new mongoose.Types.ObjectId(s));
    await CommentVote.deleteMany({ commentId: { $in: deleteIds } });
    await Comment.deleteMany({ _id: { $in: deleteIds } });
  }

  if (toTombstone.length > 0) {
    // Keep votes on tombstoned comments: they're votes by other users against the
    // original (now-hidden) content and still represent real signal in the thread.
    await Comment.updateMany(
      { _id: { $in: toTombstone } },
      { $set: { userId: null, text: TOMBSTONE_TEXT } },
    );
  }

  // Only fully-deleted top-level threads reduce the resume's visible comment count.
  // Tombstoned top-levels remain present (as "[deleted]"), so they still count.
  const countDeltas = new Map<string, number>();
  for (const t of topLevelDeleteCandidates) {
    if (!toDelete.has(t.id)) continue;
    countDeltas.set(t.resumeId, (countDeltas.get(t.resumeId) || 0) + 1);
  }
  for (const [rid, delta] of countDeltas) {
    await Resume.findByIdAndUpdate(rid, { $inc: { commentsCount: -delta } });
  }
}
