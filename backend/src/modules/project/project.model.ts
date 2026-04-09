import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveDemo?: string;
  aiStatus: "pending" | "processing" | "done" | "failed";
  aiEvaluation?: {
    codeQuality: number;
    complexity: number;
    summary: string;
    extractedSkills?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    techStack: [{ type: String, trim: true }],
    githubUrl: { type: String, trim: true, default: "" },
    liveDemo: { type: String, trim: true, default: "" },
    aiStatus: { type: String, enum: ["pending", "processing", "done", "failed"], default: "pending" },
    aiEvaluation: {
      codeQuality: { type: Number },
      complexity: { type: Number },
      summary: { type: String },
      extractedSkills: [{ type: String }],
    },
  },
  { timestamps: true },
);

export default mongoose.model<IProject>("Project", projectSchema);
