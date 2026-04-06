import mongoose, { Schema, Document } from "mongoose";

export interface IAiRoastBar {
  id: string;
  label: string;
  score: number;
}

export interface IAiRoast {
  score: number;
  roastText: string;
  verdictBars: IAiRoastBar[];
}

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;          // user-provided post title shown on cards & detail
  name: string;           // original filename (kept for reference)
  blurb: string;          // short description / "roast me because..."
  fileUrl: string;        // Cloudinary URL
  fileType: "pdf" | "image";
  likesCount: number;
  commentsCount: number;
  roastHash: string | null;
  aiRoast: IAiRoast | null;
  createdAt: Date;
  updatedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    blurb: { type: String, default: "", trim: true, maxlength: 500 },
    fileUrl: { type: String, required: true },
    fileType: { type: String, enum: ["pdf", "image"], required: true },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    roastHash: { type: String, default: null },
    aiRoast: {
      score: { type: Number },
      roastText: { type: String },
      verdictBars: [
        {
          id: { type: String },
          label: { type: String },
          score: { type: Number, min: 1, max: 5 },
        },
      ],
    },
  },
  { timestamps: true },
);

resumeSchema.index({ createdAt: -1 });
resumeSchema.index({ likesCount: -1, commentsCount: -1 });
resumeSchema.index({ title: "text", blurb: "text" }, { weights: { title: 10, blurb: 3 } });

export default mongoose.model<IResume>("Resume", resumeSchema);
