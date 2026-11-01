import mongoose, { Schema, Document } from "mongoose";

export const ADMIN_ACTIONS = [
  "user.role",
  "user.suspend",
  "user.reinstate",
  "user.delete",
  "resume.delete",
  "comment.delete",
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export interface IAdminAudit extends Document {
  actorId: mongoose.Types.ObjectId;
  action: AdminAction;
  targetType: "user" | "resume" | "comment";
  targetId: mongoose.Types.ObjectId;
  /**
   * Human-readable snapshot of the target taken at the time of the action. The
   * target is often deleted by the action itself, so a reference alone would
   * leave the log unreadable.
   */
  targetLabel: string;
  detail: string;
  createdAt: Date;
}

/**
 * Append-only record of every admin mutation. Nothing in the app updates or
 * deletes these rows, including the user cascade, so the trail outlives both
 * the targets and the admins who acted on them.
 */
const adminAuditSchema = new Schema<IAdminAudit>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ADMIN_ACTIONS, required: true },
    targetType: { type: String, enum: ["user", "resume", "comment"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetLabel: { type: String, default: "", maxlength: 200 },
    detail: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

adminAuditSchema.index({ createdAt: -1 });

export default mongoose.model<IAdminAudit>("AdminAudit", adminAuditSchema);
