import mongoose, { Schema } from "mongoose";
import Notification, { type NotificationType } from "./notification.model.js";
import Like from "../resume/like.model.js";
import Resume from "../resume/resume.model.js";
import Comment from "../comment/comment.model.js";
import CommentVote from "../comment/comment-vote.model.js";
import { getRedis } from "../../common/config/redis.js";

/**
 * Builds notifications from data the app already stores — likes, comment
 * upvotes, comments — instead of writing them inside the request that caused
 * them. Likes and comments pay no extra latency, and the source collections
 * are the durable event log: if a run fails, its watermark doesn't move and the
 * next run picks the same events up again.
 *
 * Correctness rests on every write being idempotent (see notification.model.ts),
 * which is what makes the overlap window and concurrent runs safe:
 *   - each run re-reads OVERLAP_MS before its watermark, so a write whose
 *     timestamp was taken before a commit that landed late is still seen;
 *   - two runs at once (a deploy's container swap) produce the same rows.
 */

const PAGE_SIZE = 500;
const OVERLAP_MS = 2 * 60_000;
// Bounds one run during a backlog; the next run continues from the watermark.
const RUN_BUDGET_MS = 40_000;
// Just under the interval, so a crashed run can't block the next one for long.
// Not a correctness guard (writes are idempotent), only saves duplicate work.
const LOCK_KEY = "notif:sweep:lock";
const LOCK_TTL_SECONDS = 55;
const EPOCH = new Date(0);

// ─── Watermarks ──────────────────────────────────────────────────────────────

const sweepStateSchema = new Schema(
  {
    _id: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { versionKey: false },
);

export const SweepState = mongoose.model("NotificationSweepState", sweepStateSchema);

type Doc = { _id: mongoose.Types.ObjectId } & Record<string, any>;

/**
 * Pages through `model` in (`field`, _id) order from the stored watermark,
 * handing each page to `handle` and advancing the watermark only after it
 * succeeds. Returns the number of source documents processed.
 */
async function drain(
  source: string,
  model: mongoose.Model<any>,
  field: "updatedAt" | "createdAt",
  filter: Record<string, unknown>,
  handle: (docs: Doc[]) => Promise<void>,
  deadline: number,
): Promise<number> {
  const state = await SweepState.findById(source).lean();
  if (!state) {
    // First run for this source: start from now rather than notifying every
    // user about their entire history.
    await SweepState.updateOne({ _id: source }, { $setOnInsert: { at: new Date() } }, { upsert: true });
    return 0;
  }

  let since = new Date(state.at.getTime() - OVERLAP_MS);
  let afterId: mongoose.Types.ObjectId | null = null;
  let processed = 0;

  for (;;) {
    const range = afterId
      ? { $or: [{ [field]: { $gt: since } }, { [field]: since, _id: { $gt: afterId } }] }
      : { [field]: { $gte: since } };
    const docs = (await model
      .find({ ...filter, ...range })
      .sort({ [field]: 1, _id: 1 })
      .limit(PAGE_SIZE)
      .lean()) as Doc[];
    if (docs.length === 0) break;

    await handle(docs);
    processed += docs.length;

    const last = docs[docs.length - 1];
    since = last[field] as Date;
    afterId = last._id;
    await SweepState.updateOne({ _id: source }, { $max: { at: since } });

    if (docs.length < PAGE_SIZE || Date.now() > deadline) break;
  }
  return processed;
}

// ─── Writes ──────────────────────────────────────────────────────────────────

function isDuplicateKey(err: unknown): boolean {
  const e = err as { code?: number; writeErrors?: { code?: number }[] };
  if (e?.code === 11000) return true;
  return Array.isArray(e?.writeErrors) && e.writeErrors.length > 0 && e.writeErrors.every((w) => w.code === 11000);
}

type Aggregate = {
  recipientId: mongoose.Types.ObjectId;
  key: string;
  type: NotificationType;
  actorId: mongoose.Types.ObjectId;
  resumeId: mongoose.Types.ObjectId;
  commentId: mongoose.Types.ObjectId | null;
  resumeTitle: string;
  count: number;
  at: Date;
};

/**
 * One row per liked post / upvoted comment. Replaying an event already folded
 * in changes nothing; an event newer than the row's `readAt` makes it unread
 * again, which is how "3 more people liked your post" resurfaces after reading.
 */
async function upsertAggregate(n: Aggregate): Promise<void> {
  const update = [
    {
      $set: {
        type: { $literal: n.type },
        resumeId: n.resumeId,
        commentId: n.commentId,
        // $literal: a title starting with "$" would otherwise be read as a field path.
        resumeTitle: { $literal: n.resumeTitle },
        // The target's own counter, so unlikes are reflected and replays don't inflate it.
        count: { $literal: Math.max(1, n.count) },
        actorId: { $cond: [{ $gte: [n.at, { $ifNull: ["$lastEventAt", EPOCH] }] }, n.actorId, "$actorId"] },
        readAt: { $cond: [{ $gt: [n.at, { $ifNull: ["$readAt", EPOCH] }] }, null, "$readAt"] },
        lastEventAt: { $max: [n.at, { $ifNull: ["$lastEventAt", EPOCH] }] },
      },
    },
  ];
  const run = () =>
    Notification.updateOne({ recipientId: n.recipientId, key: n.key }, update, {
      upsert: true,
      // Mongoose 9 requires an explicit opt-in for aggregation-pipeline updates.
      updatePipeline: true,
    });
  try {
    await run();
  } catch (err) {
    // A concurrent run inserted the row between our match and insert; it exists now.
    if (!isDuplicateKey(err)) throw err;
    await run();
  }
}

const sameId = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

// ─── Sources ─────────────────────────────────────────────────────────────────

async function handleLikes(likes: Doc[]): Promise<void> {
  // Pages are in time order, so the last like seen per post is its latest.
  const latest = new Map<string, Doc>();
  for (const l of likes) latest.set(String(l.resumeId), l);

  const resumes = await Resume.find({ _id: { $in: [...latest.keys()] } })
    .select("userId title likesCount")
    .lean();

  await Promise.all(
    resumes.map((r) => {
      const like = latest.get(String(r._id))!;
      // Reacting to your own post is rejected upstream; this keeps the sweep honest regardless.
      if (sameId(like.userId, r.userId)) return;
      return upsertAggregate({
        recipientId: r.userId,
        key: `like:${r._id}`,
        type: "like",
        actorId: like.userId,
        resumeId: r._id as mongoose.Types.ObjectId,
        commentId: null,
        resumeTitle: r.title ?? "",
        count: Number(r.likesCount) || 1,
        at: like.updatedAt,
      });
    }),
  );
}

async function handleUpvotes(votes: Doc[]): Promise<void> {
  const byComment = new Map<string, Doc[]>();
  for (const v of votes) {
    const k = String(v.commentId);
    if (!byComment.has(k)) byComment.set(k, []);
    byComment.get(k)!.push(v);
  }

  const comments = await Comment.find({ _id: { $in: [...byComment.keys()] }, userId: { $ne: null } })
    .select("userId resumeId upvotesCount")
    .lean();
  const titles = await resumeTitles(comments.map((c) => c.resumeId));

  await Promise.all(
    comments.map((c) => {
      // Latest upvote that isn't the author upvoting their own comment.
      const events = byComment.get(String(c._id))!;
      const vote = [...events].reverse().find((v) => !sameId(v.userId, c.userId));
      if (!vote) return;
      return upsertAggregate({
        recipientId: c.userId!,
        key: `comment_like:${c._id}`,
        type: "comment_like",
        actorId: vote.userId,
        resumeId: c.resumeId,
        commentId: c._id as mongoose.Types.ObjectId,
        resumeTitle: titles.get(String(c.resumeId))?.title ?? "",
        count: Number(c.upvotesCount) || 1,
        at: vote.updatedAt,
      });
    }),
  );
}

async function handleComments(comments: Doc[]): Promise<void> {
  const parentIds = comments.filter((c) => c.parentId).map((c) => c.parentId);
  const [parents, titles] = await Promise.all([
    parentIds.length
      ? Comment.find({ _id: { $in: parentIds } }).select("userId").lean()
      : Promise.resolve([]),
    resumeTitles(comments.map((c) => c.resumeId)),
  ]);
  const parentAuthor = new Map(parents.map((p) => [String(p._id), p.userId]));

  const ops = [];
  for (const c of comments) {
    const resume = titles.get(String(c.resumeId));
    if (!resume) continue;
    // Top-level → the post's owner. Reply → the parent's author (null if tombstoned).
    const recipientId = c.parentId ? parentAuthor.get(String(c.parentId)) : resume.userId;
    if (!recipientId || sameId(recipientId, c.userId)) continue;

    const type: NotificationType = c.parentId ? "reply" : "comment";
    ops.push({
      updateOne: {
        filter: { recipientId, key: `${type}:${c._id}` },
        update: {
          $setOnInsert: {
            type,
            actorId: c.userId,
            resumeId: c.resumeId,
            resumeTitle: resume.title,
            commentId: c._id,
            count: 1,
            readAt: null,
            lastEventAt: c.createdAt,
          },
        },
        upsert: true,
      },
    });
  }
  if (ops.length === 0) return;

  try {
    await Notification.bulkWrite(ops, { ordered: false });
  } catch (err) {
    // Unordered: everything else was applied; duplicates mean a concurrent run got there first.
    if (!isDuplicateKey(err)) throw err;
  }
}

async function resumeTitles(ids: unknown[]) {
  const unique = [...new Set(ids.map(String))];
  const rows = await Resume.find({ _id: { $in: unique } }).select("userId title").lean();
  return new Map(rows.map((r) => [String(r._id), { userId: r.userId, title: r.title ?? "" }]));
}

// ─── Run + schedule ──────────────────────────────────────────────────────────

async function acquireLock(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    return (await redis.set(LOCK_KEY, Date.now(), { nx: true, ex: LOCK_TTL_SECONDS })) !== null;
  } catch (err) {
    // Fail open: writes are idempotent, so a duplicate run is only wasted work.
    console.warn("Notification sweep lock unavailable, running anyway:", err);
    return true;
  }
}

let running = false;

export type SweepResult = { likes: number; upvotes: number; comments: number };

/** One pass over every source. Null when another run holds the lock. */
export async function runSweep(): Promise<SweepResult | null> {
  if (running) return null;
  running = true;
  try {
    if (!(await acquireLock())) return null;
    const deadline = Date.now() + RUN_BUDGET_MS;
    // Legacy like rows predate the `reaction` field and count as likes.
    const likes = await drain("likes", Like, "updatedAt", { reaction: { $ne: "dislike" } }, handleLikes, deadline);
    const upvotes = await drain("upvotes", CommentVote, "updatedAt", { voteType: "upvote" }, handleUpvotes, deadline);
    const comments = await drain("comments", Comment, "createdAt", { userId: { $ne: null } }, handleComments, deadline);
    return { likes, upvotes, comments };
  } finally {
    running = false;
  }
}

/** Runs the sweep now and every `intervalMs`. Returns a stop function. */
export function startNotificationSweep(intervalMs = 60_000): () => void {
  const tick = () => {
    runSweep().catch((err) => console.error("Notification sweep failed:", err));
  };
  const timer = setInterval(tick, intervalMs);
  // Don't hold the process open on shutdown.
  timer.unref();
  tick();
  return () => clearInterval(timer);
}
