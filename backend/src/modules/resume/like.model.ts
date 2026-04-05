import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

likeSchema.index({ resumeId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
