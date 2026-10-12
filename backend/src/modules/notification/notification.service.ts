import mongoose from "mongoose";
import Notification from "./notification.model.js";
// Registers the User model that populate("actorId") resolves against.
import "../auth/auth.model.js";
import Comment, { TOMBSTONE_TEXT } from "../comment/comment.model.js";
import ApiError from "../../common/utils/api-error.js";

/**
 * Read side. Notifications are produced by the sweep (notification.sweep.ts) from
 * likes, votes and comments that are already stored, so nothing here — and
 * nothing in the like/comment request path — creates them.
 */

const UNREAD_CAP = 100;
const PREVIEW_CHARS = 140;

// ─── Reads ───────────────────────────────────────────────────────────────────

export function encodeCursor(lastEventAt: Date, id: unknown): string {
  return `${lastEventAt.getTime()}_${String(id)}`;
}

export function decodeCursor(raw: string): { at: Date; id: mongoose.Types.ObjectId } {
  const [ms, id] = raw.split("_");
  const at = new Date(Number(ms));
  if (!ms || !id || Number.isNaN(at.getTime()) || !mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest("Invalid cursor");
  }
  return { at, id: new mongoose.Types.ObjectId(id) };
}

function previewOf(text: string | undefined): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_CHARS ? `${flat.slice(0, PREVIEW_CHARS).trimEnd()}…` : flat;
}

export async function listNotifications(
  userId: string,
  opts: { cursor?: string; limit: number; unreadOnly: boolean },
) {
  const filter: Record<string, unknown> = { recipientId: userId };
  if (opts.unreadOnly) filter.readAt = null;
  if (opts.cursor) {
    const { at, id } = decodeCursor(opts.cursor);
    filter.$or = [{ lastEventAt: { $lt: at } }, { lastEventAt: at, _id: { $lt: id } }];
  }

  const rows = await Notification.find(filter)
    .sort({ lastEventAt: -1, _id: -1 })
    .limit(opts.limit + 1)
    .populate("actorId", "anonymousUsername")
    .lean();

  const hasMore = rows.length > opts.limit;
  const page = hasMore ? rows.slice(0, opts.limit) : rows;
  const last = page[page.length - 1];

  // Quoted from the live comment, so edits show and a deleted one just has no quote.
  const commentIds = page.map((n) => n.commentId).filter(Boolean);
  const texts = new Map<string, string>();
  if (commentIds.length > 0) {
    const comments = await Comment.find({ _id: { $in: commentIds } }).select("text").lean();
    for (const c of comments) {
      if (c.text && c.text !== TOMBSTONE_TEXT) texts.set(String(c._id), c.text);
    }
  }

  return {
    items: page.map((n) => {
      const actor = n.actorId as unknown as { _id: unknown; anonymousUsername?: string } | null;
      return {
        _id: n._id,
        type: n.type,
        actor: actor ? { _id: actor._id, anonymousUsername: actor.anonymousUsername ?? "Anon" } : null,
        resumeId: n.resumeId,
        resumeTitle: n.resumeTitle,
        commentId: n.commentId,
        preview: previewOf(n.commentId ? texts.get(String(n.commentId)) : undefined),
        count: n.count,
        readAt: n.readAt,
        lastEventAt: n.lastEventAt,
      };
    }),
    nextCursor: hasMore && last ? encodeCursor(last.lastEventAt, last._id) : null,
  };
}

/** Unread badge value, capped so the query stays bounded for a user with a huge backlog. */
export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ recipientId: userId, readAt: null }, { limit: UNREAD_CAP });
}

// ─── Writes ──────────────────────────────────────────────────────────────────

export async function markRead(userId: string, id: string): Promise<void> {
  const res = await Notification.updateOne(
    { _id: id, recipientId: userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  if (res.matchedCount === 0) {
    // Already read is fine; someone else's or missing id is not.
    const exists = await Notification.exists({ _id: id, recipientId: userId });
    if (!exists) throw ApiError.notfound("Notification not found");
  }
}

export async function markAllRead(userId: string): Promise<void> {
  await Notification.updateMany({ recipientId: userId, readAt: null }, { $set: { readAt: new Date() } });
}

export async function deleteNotification(userId: string, id: string): Promise<void> {
  const res = await Notification.deleteOne({ _id: id, recipientId: userId });
  if (res.deletedCount === 0) throw ApiError.notfound("Notification not found");
}
