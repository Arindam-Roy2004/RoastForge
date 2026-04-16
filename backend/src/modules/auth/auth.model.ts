import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["user", "recruiter"], default: "user" },
    anonymousUsername: { type: String, unique: true },
    refreshToken: { type: String, select: false },
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
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (plain: string) {
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
