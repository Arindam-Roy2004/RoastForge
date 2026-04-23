import mongoose, { Schema } from "mongoose";

export type ResumeReactionType = "like" | "dislike";

const likeSchema = new Schema(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reaction: { type: String, enum: ["like", "dislike"], required: true, default: "like" },
  },
  { timestamps: true },
);

likeSchema.index({ resumeId: 1, userId: 1 }, { unique: true });
likeSchema.index({ userId: 1, createdAt: -1 });
likeSchema.index({ resumeId: 1, reaction: 1 });

export default mongoose.model("Like", likeSchema);
