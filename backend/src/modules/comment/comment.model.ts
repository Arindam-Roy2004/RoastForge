import mongoose, { Schema, Document } from "mongoose";

/**
 * Replacement body for comments whose author deleted themselves but whose
 * subtree contains replies from other users. We preserve the node so the
 * surrounding thread structure (and other users' contributions) survive.
 */
export const TOMBSTONE_TEXT = "[deleted by user]";

export interface IComment extends Document {
  resumeId: mongoose.Types.ObjectId;
  /** Null when the author deleted their account (or this comment) but replies by others kept the node alive. */
  userId: mongoose.Types.ObjectId | null;
  text: string;
  parentId: mongoose.Types.ObjectId | null;
  upvotesCount: number;
  downvotesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    // Nullable on purpose — see TOMBSTONE_TEXT above. New comments always have a userId
    // (the route requires auth); null is only written by the tombstone cascade.
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    text: { type: String, required: true, maxlength: 2000 },
    parentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    upvotesCount: { type: Number, default: 0 },
    downvotesCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

commentSchema.index({ resumeId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

export default mongoose.model<IComment>("Comment", commentSchema);
