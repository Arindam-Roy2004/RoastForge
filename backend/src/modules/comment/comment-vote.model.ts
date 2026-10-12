import mongoose, { Schema } from "mongoose";

const commentVoteSchema = new Schema(
  {
    commentId: { type: Schema.Types.ObjectId, ref: "Comment", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    voteType: { type: String, enum: ["upvote", "downvote"], required: true },
  },
  { timestamps: true },
);

commentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });
// Notification sweep scans by (updatedAt, _id) from its watermark.
commentVoteSchema.index({ updatedAt: 1, _id: 1 });

export default mongoose.model("CommentVote", commentVoteSchema);
