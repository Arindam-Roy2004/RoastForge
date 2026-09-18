import mongoose, { Schema, Document } from "mongoose";
import { AVATAR_STYLES, type AvatarStyle } from "../../common/utils/avatar-styles.js";

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
  avatarStyle: AvatarStyle | null;
  avatarSeed: string | null;
  /** DiceBear `backgroundColor` (hex without #, or "transparent"); null = API default. */
  avatarBackgroundColor: string | null;
  avatarFlip: boolean;
  avatarRotate: number;
  avatarRadius: number;
  avatarScale: number;
  likesCount: number;
  dislikesCount: number;
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
    avatarStyle: { type: String, enum: AVATAR_STYLES, default: null },
    avatarSeed: { type: String, default: null, maxlength: 120 },
    avatarBackgroundColor: { type: String, default: null, maxlength: 20 },
    avatarFlip: { type: Boolean, default: false },
    avatarRotate: { type: Number, default: 0, min: 0, max: 360 },
    avatarRadius: { type: Number, default: 0, min: 0, max: 50 },
    avatarScale: { type: Number, default: 100, min: 0, max: 200 },
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },
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

// Every index below exists to serve a specific sort this app issues. MongoDB can
// only use an index for a sort when the sort keys are a prefix of the index keys
// in the same order and direction; the moment they diverge it falls back to a
// blocking in-memory sort, which gets worse as `skip` grows down the feed. So the
// key order here has to track the sort specs in the services verbatim — if you
// change a sort, change its index with it.

// resume.service.ts listResumes — sort: "new" → { createdAt: -1 }
resumeSchema.index({ createdAt: -1 });

// resume.service.ts listResumes — sort: "hot" → { likesCount: -1, commentsCount: -1, createdAt: -1 }
resumeSchema.index({ likesCount: -1, commentsCount: -1, createdAt: -1 });

// resume.service.ts listResumes — sort: "top" → { likesCount: -1, createdAt: -1 }.
// The "hot" index above cannot serve this: createdAt is its third key, so
// { likesCount, createdAt } is not a prefix of it.
resumeSchema.index({ likesCount: -1, createdAt: -1 });

// recruiter.service.ts searchCandidates — covers both the `aiRoast.score: { $gte }`
// match and the { "aiRoast.score": -1, createdAt: -1 } sort that runs ahead of the
// $group, i.e. over the whole matched set rather than the 50 rows finally returned.
resumeSchema.index({ "aiRoast.score": -1, createdAt: -1 });

// resume.service.ts listResumes — the $text search branch, with title weighted
// above blurb for relevance ranking.
resumeSchema.index({ title: "text", blurb: "text" }, { weights: { title: 10, blurb: 3 } });

// Removed: { likesCount: -1, dislikesCount: 1, commentsCount: -1 }. No query
// sorts or filters on dislikesCount — it is only ever read as a field — so that
// index cost write amplification on every reaction and served nothing. Existing
// deployments keep it until it is dropped explicitly; see the note in the PR.

export default mongoose.model<IResume>("Resume", resumeSchema);
