import mongoose, { Schema, Document } from "mongoose";

export const NOTIFICATION_TYPES = ["comment", "reply", "like", "comment_like"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const RETENTION_SECONDS = 90 * 24 * 60 * 60;

/**
 * Written only by the sweep (notification.sweep.ts), never in a request.
 *
 * `key` identifies the thing being notified about, and `{recipientId, key}` is
 * unique, so the sweep can process the same source event any number of times
 * and still produce exactly one row:
 *   like:<resumeId>          one row per post, "Alex and 4 others liked…"
 *   comment_like:<commentId> one row per comment
 *   comment:<commentId>      one row per comment
 *   reply:<commentId>        one row per reply
 */
export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  key: string;
  type: NotificationType;
  /** Most recent actor. */
  actorId: mongoose.Types.ObjectId | null;
  resumeId: mongoose.Types.ObjectId | null;
  /** Snapshot, so the list renders without joining resumes. */
  resumeTitle: string;
  commentId: mongoose.Types.ObjectId | null;
  /** Total likes/upvotes on the target, read from its counter. 1 for comments and replies. */
  count: number;
  /** Null while unread. Cleared again when new activity arrives after it. */
  readAt: Date | null;
  /** Time of the latest source event. Sort key and TTL anchor. */
  lastEventAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  key: { type: String, required: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  resumeId: { type: Schema.Types.ObjectId, ref: "Resume", default: null },
  resumeTitle: { type: String, default: "", maxlength: 200 },
  commentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  count: { type: Number, default: 1, min: 1 },
  readAt: { type: Date, default: null },
  lastEventAt: { type: Date, required: true },
});

notificationSchema.index({ recipientId: 1, key: 1 }, { unique: true });
// List: newest first per recipient, _id as tiebreaker for the cursor.
notificationSchema.index({ recipientId: 1, lastEventAt: -1, _id: -1 });
notificationSchema.index({ recipientId: 1, readAt: 1 });
// Cascade deletes.
notificationSchema.index({ actorId: 1 });
notificationSchema.index({ resumeId: 1 });
notificationSchema.index({ commentId: 1 });
notificationSchema.index({ lastEventAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

export default mongoose.model<INotification>("Notification", notificationSchema);
