import mongoose from "mongoose";
import Comment from "./comment.model.js";

/**
 * Returns every descendant comment id under `rootId`, including the root itself.
 * Uses a single `$graphLookup` aggregation — one round-trip regardless of tree depth,
 * avoiding the recursive N-query walk previously used in the user-cascade path.
 */
export async function collectCommentSubtreeIds(
  rootId: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId[]> {
  const result = await Comment.aggregate<{ _id: mongoose.Types.ObjectId; descendants: { _id: mongoose.Types.ObjectId }[] }>([
    { $match: { _id: rootId } },
    {
      $graphLookup: {
        from: Comment.collection.name,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentId",
        as: "descendants",
        maxDepth: 20,
      },
    },
    { $project: { _id: 1, descendants: { _id: 1 } } },
  ]);

  if (result.length === 0) return [];
  const [{ _id, descendants }] = result;
  return [_id, ...descendants.map((d) => d._id)];
}

/**
 * Returns true if the subtree under `rootId` contains any comment authored by
 * someone other than `authorId` (ignoring tombstoned nodes, whose `userId` is null).
 *
 * Used by deletion paths to decide between a hard-delete (pure-author subtree)
 * and a tombstone (preserve node so other users' replies stay legible).
 */
export async function subtreeContainsOtherAuthor(
  rootId: mongoose.Types.ObjectId,
  authorId: mongoose.Types.ObjectId,
): Promise<boolean> {
  const ids = await collectCommentSubtreeIds(rootId);
  const descendants = ids.filter((i) => !i.equals(rootId));
  if (descendants.length === 0) return false;
  const other = await Comment.exists({
    _id: { $in: descendants },
    userId: { $nin: [authorId, null] },
  });
  return !!other;
}
