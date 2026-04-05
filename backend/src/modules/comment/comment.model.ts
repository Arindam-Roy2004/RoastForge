import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  resumeId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
