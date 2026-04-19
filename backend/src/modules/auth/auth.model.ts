import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { AVATAR_STYLES } from "../../common/utils/avatar-styles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Password is optional now that Google is the sole sign-in method. Existing
    // bcrypt hashes from the password era stay in place but are never read.
    password: { type: String, minlength: 8, select: false },
    // Stable Google subject (`sub` claim). Sparse so accounts created before
    // Google auth (or never linked) don't all collide on `null`.
    googleId: { type: String, unique: true, sparse: true, select: false },
    avatar: { type: String, default: "" },
    preferredAvatarStyle: { type: String, enum: AVATAR_STYLES, default: null },
    /** DiceBear `backgroundColor` (6-char hex without #, or "transparent"). */
    preferredAvatarBackgroundColor: { type: String, default: null, maxlength: 20 },
    preferredAvatarFlip: { type: Boolean, default: false },
    preferredAvatarRotate: { type: Number, default: 0, min: 0, max: 360 },
    preferredAvatarRadius: { type: Number, default: 0, min: 0, max: 50 },
    preferredAvatarScale: { type: Number, default: 100, min: 0, max: 200 },
    role: { type: String, enum: ["user", "recruiter"], default: "user" },
    anonymousUsername: { type: String, unique: true },
    refreshToken: { type: String, select: false },
    // Default true so anyone created before this field existed skips onboarding.
    // Fresh Google sign-ups explicitly flip this to false until they pick a role.
    onboardingCompleted: { type: Boolean, default: true },
    publicProfile: {
      displayName: { type: String, trim: true, maxlength: 100, default: "" },
      linkedInUrl: { type: String, trim: true, default: "" },
      githubUrl: { type: String, trim: true, default: "" },
      shareIdentityWithRecruiters: { type: Boolean, default: false },
      // Candidate-declared job role they are targeting (e.g. "Backend Engineer").
      // Used for recruiter search; stored as-entered for display, matched case-insensitively.
      targetRole: { type: String, trim: true, maxlength: 80, default: "" },
      // Candidate-declared skills. Stored lowercased & deduped so $in queries are exact-cheap.
      // Capped to keep payloads bounded and stop abuse.
      skills: {
        type: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
        default: [],
        validate: [(v: string[]) => !v || v.length <= 25, "Too many skills (max 25)"],
      },
    },
    talentMetrics: {
      composite: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

// Indexes for recruiter candidate search. Sparse-friendly since most users start blank.
userSchema.index({ "publicProfile.targetRole": 1 });
userSchema.index({ "publicProfile.skills": 1 });

userSchema.pre("save", async function () {
  // Password is optional now (Google-only signups have none) — nothing to hash
  // if the field isn't present or wasn't touched on this save.
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (plain: string) {
  if (!this.password) return false;
  return bcrypt.compare(plain, this.password);
};

async function runUserCascade(filter: { _id?: unknown }) {
  const raw = filter._id;
  if (raw == null) return;
  const id = typeof raw === "string" ? raw : (raw as mongoose.Types.ObjectId).toString();
  const { purgeUserData } = await import("./user-cascade.service.js");
  await purgeUserData(id);
}

/** Cascade-delete related docs when a user row is removed (any code path). */
userSchema.pre("findOneAndDelete", async function (this: mongoose.Query<unknown, unknown>) {
  await runUserCascade(this.getFilter() as { _id?: unknown });
});

userSchema.pre("deleteOne", { document: true, query: false }, async function () {
  const id = (this as unknown as { _id?: mongoose.Types.ObjectId })._id;
  if (id) await runUserCascade({ _id: id });
});

export default mongoose.model("User", userSchema);
