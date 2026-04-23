import Resume from "./resume.model.js";
import Like, { type ResumeReactionType } from "./like.model.js";
import Comment from "../comment/comment.model.js";
import CommentVote from "../comment/comment-vote.model.js";
import User from "../auth/auth.model.js";
import ApiError from "../../common/utils/api-error.js";
import mongoose from "mongoose";
import type { AvatarStyle } from "../../common/utils/avatar-styles.js";
import {
  AVATAR_ROTATES,
  AVATAR_RADIUS_MAX,
  AVATAR_RADIUS_MIN,
  AVATAR_SCALE_MAX,
  AVATAR_SCALE_MIN,
} from "../../common/utils/avatar-styles.js";
import { safeRecalcTalentScore } from "../auth/talent-score.service.js";

const PAGE_SIZE = 3;
const REACTION_VALUES: readonly ResumeReactionType[] = ["like", "dislike"] as const;

/** AI roast is private to the uploader — never expose in public list/API. */
function stripPrivateRoastFields<T extends Record<string, unknown>>(doc: T): T {
  const out = { ...doc };
  delete out.aiRoast;
  delete out.roastHash;
  return out;
}

function resumeOwnerId(resume: { userId: unknown }): string {
  const u = resume.userId as { _id?: mongoose.Types.ObjectId } | mongoose.Types.ObjectId | string;
  if (u && typeof u === "object" && "_id" in u && u._id) return u._id.toString();
  if (u && typeof u === "object" && "toString" in u) return (u as mongoose.Types.ObjectId).toString();
  return String(u);
}

// Populate user info for public display
const populateUser = (q: any) =>
  q.populate("userId", "name avatar anonymousUsername");

/**
 * Normalise a Like document's `reaction` field for API responses.
 * Legacy docs (pre-reaction-feature) have no `reaction` field — those are
 * treated as likes so existing UI badges don't silently disappear.
 */
function toViewerReaction(v: unknown): ResumeReactionType {
  if (v === "dislike") return "dislike";
  return "like";
}

function isTransactionUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    msg.includes("Transaction numbers are only allowed on a replica set member or mongos")
    || msg.includes("Transaction support is not enabled")
  );
}

export const listResumes = async (opts: {
  page: number;
  sort: "new" | "hot" | "top";
  search?: string;
  viewerId?: string;
}) => {
  const { page = 1, sort, search, viewerId } = opts;

  const filter: any = {};
  let useTextScore = false;

  if (search && search.trim().length > 0) {
    const q = search.trim();
    // Use MongoDB $text index for multi-word / long queries (leverages weights on title & blurb).
    // Fall back to regex for very short single-token queries where $text is too strict.
    if (q.length >= 3 && /\s/.test(q) === false) {
      // Single short token — regex gives better partial-match UX
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { blurb: { $regex: escaped, $options: "i" } },
      ];
    } else if (q.length >= 2) {
      // Multi-word or longer query — use text index for relevance scoring
      filter.$text = { $search: q };
      useTextScore = true;
    }
  }

  let sortObj: any = { createdAt: -1 };
  if (useTextScore && sort === "new") {
    // When searching, rank by relevance first, then recency
    sortObj = { score: { $meta: "textScore" }, createdAt: -1 };
  } else if (sort === "hot") {
    sortObj = { likesCount: -1, commentsCount: -1, createdAt: -1 };
  } else if (sort === "top") {
    sortObj = { likesCount: -1, createdAt: -1 };
  }

  const total = await Resume.countDocuments(filter);

  let query = Resume.find(filter).sort(sortObj).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE);
  if (useTextScore) query = query.select({ score: { $meta: "textScore" } });
  const resumes = (await populateUser(query)) as any[];

  // Attach viewer reaction for authenticated viewer. Compound unique index on
  // (resumeId, userId) means this is at most one row per resume.
  let reactionByResume = new Map<string, ResumeReactionType>();
  if (viewerId) {
    const reactions = await Like.find({
      resumeId: { $in: resumes.map((r: any) => r._id) },
      userId: viewerId,
    }).select("resumeId reaction");
    reactionByResume = new Map(
      reactions.map((r) => [r.resumeId.toString(), toViewerReaction((r as any).reaction)]),
    );
  }

  return {
    resumes: resumes.map((r: any) => ({
      ...stripPrivateRoastFields(r.toObject() as Record<string, unknown>),
      viewerReaction: reactionByResume.get(r._id.toString()) ?? null,
      isLiked: reactionByResume.get(r._id.toString()) === "like",
      isDisliked: reactionByResume.get(r._id.toString()) === "dislike",
      likesCount: Math.max(0, Number(r.likesCount) || 0),
      dislikesCount: Math.max(0, Number((r as any).dislikesCount) || 0),
    })),
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  };
};

export const getResumeById = async (id: string, viewerId?: string) => {
  const resume = await populateUser(Resume.findById(id));
  if (!resume) throw ApiError.notfound("Resume not found");

  let viewerReaction: ResumeReactionType | null = null;
  if (viewerId) {
    const reaction = await Like.findOne({ resumeId: id, userId: viewerId }).select("reaction");
    viewerReaction = reaction ? toViewerReaction((reaction as any)?.reaction) : null;
  }

  const obj = resume.toObject() as Record<string, unknown>;
  const ownerId = resumeOwnerId(resume);
  const isOwner = Boolean(viewerId && viewerId === ownerId);
  const safe = isOwner ? obj : stripPrivateRoastFields(obj);

  return {
    ...safe,
    viewerReaction,
    isLiked: viewerReaction === "like",
    isDisliked: viewerReaction === "dislike",
    likesCount: Math.max(0, Number((safe as any).likesCount) || 0),
    dislikesCount: Math.max(0, Number((safe as any).dislikesCount) || 0),
    isOwner,
  };
};

export const getMyResumes = async (userId: string) => {
  return populateUser(Resume.find({ userId }).sort({ createdAt: -1 }));
};

function normalizeAvatarBg(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const t = raw.trim().toLowerCase();
  if (t === "transparent") return "transparent";
  if (/^[a-f0-9]{6}$/.test(t)) return t;
  return null;
}

function normalizeRotate(raw: number | undefined, fallback: number): number {
  if (raw == null) return fallback;
  return (AVATAR_ROTATES as readonly number[]).includes(raw) ? raw : fallback;
}

function clampInt(raw: number | undefined, min: number, max: number, fallback: number): number {
  if (raw == null || !Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

type AvatarInput = {
  avatarStyle?: AvatarStyle;
  avatarSeed?: string;
  avatarBackgroundColor?: string | null;
  avatarFlip?: boolean;
  avatarRotate?: number;
  avatarRadius?: number;
  avatarScale?: number;
};

type ResolvedAvatar = {
  avatarStyle: AvatarStyle | null;
  avatarSeed: string | null;
  avatarBackgroundColor: string | null;
  avatarFlip: boolean;
  avatarRotate: number;
  avatarRadius: number;
  avatarScale: number;
};

/**
 * Resolves user-supplied avatar options against the user's stored preferences
 * and updates the user doc when any preference changes. Centralised so
 * createResume stays small and the defaulting rules live in one place.
 */
async function resolveAndPersistAvatar(
  userId: string,
  input: AvatarInput,
): Promise<ResolvedAvatar> {
  const user = await User.findById(userId).select(
    "preferredAvatarStyle preferredAvatarBackgroundColor preferredAvatarFlip preferredAvatarRotate preferredAvatarRadius preferredAvatarScale",
  );
  if (!user) throw ApiError.notfound("User not found");

  const style: AvatarStyle | null = input.avatarStyle ?? user.preferredAvatarStyle ?? null;

  const seed =
    style == null
      ? null
      : (() => {
          const trimmed = input.avatarSeed?.trim();
          return trimmed && trimmed.length > 0 ? trimmed.slice(0, 120) : userId;
        })();

  const bg =
    input.avatarBackgroundColor !== undefined
      ? normalizeAvatarBg(input.avatarBackgroundColor)
      : normalizeAvatarBg(user.preferredAvatarBackgroundColor ?? undefined);

  const flip = input.avatarFlip !== undefined ? input.avatarFlip : Boolean(user.preferredAvatarFlip);
  const rotate = normalizeRotate(input.avatarRotate, Number(user.preferredAvatarRotate ?? 0));
  const radius = clampInt(input.avatarRadius, AVATAR_RADIUS_MIN, AVATAR_RADIUS_MAX, Number(user.preferredAvatarRadius ?? 0));
  const scale = clampInt(input.avatarScale, AVATAR_SCALE_MIN, AVATAR_SCALE_MAX, Number(user.preferredAvatarScale ?? 100));

  // Persist as the new defaults so future uploads start from here.
  let dirty = false;
  if (style !== user.preferredAvatarStyle) { user.preferredAvatarStyle = style; dirty = true; }
  if (bg !== normalizeAvatarBg(user.preferredAvatarBackgroundColor ?? undefined)) { user.preferredAvatarBackgroundColor = bg; dirty = true; }
  if (flip !== Boolean(user.preferredAvatarFlip)) { user.preferredAvatarFlip = flip; dirty = true; }
  if (rotate !== Number(user.preferredAvatarRotate ?? 0)) { user.preferredAvatarRotate = rotate; dirty = true; }
  if (radius !== Number(user.preferredAvatarRadius ?? 0)) { user.preferredAvatarRadius = radius; dirty = true; }
  if (scale !== Number(user.preferredAvatarScale ?? 100)) { user.preferredAvatarScale = scale; dirty = true; }
  if (dirty) await user.save();

  return {
    avatarStyle: style,
    avatarSeed: seed,
    avatarBackgroundColor: bg,
    avatarFlip: flip,
    avatarRotate: rotate,
    avatarRadius: radius,
    avatarScale: scale,
  };
}

export const createResume = async (
  userId: string,
  data: {
    title: string;
    name: string;
    blurb?: string;
    fileUrl: string;
    fileType: "pdf" | "image";
  } & AvatarInput,
) => {
  const avatar = await resolveAndPersistAvatar(userId, data);

  return Resume.create({
    userId,
    title: data.title,
    name: data.name,
    blurb: data.blurb,
    fileUrl: data.fileUrl,
    fileType: data.fileType,
    ...avatar,
  });
};

export const updateResume = async (
  id: string,
  userId: string,
  data: { title?: string; name?: string; blurb?: string },
) => {
  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) throw ApiError.notfound("Resume not found or not yours");
  if (data.title !== undefined) resume.title = data.title;
  if (data.name !== undefined) resume.name = data.name;
  if (data.blurb !== undefined) resume.blurb = data.blurb;
  await resume.save();
  return resume;
};

export const deleteResume = async (id: string, userId: string) => {
  const resume = await Resume.findOneAndDelete({ _id: id, userId });
  if (!resume) throw ApiError.notfound("Resume not found or not yours");
  // Cascade: likes, comments, and votes on those comments.
  const commentIds = await Comment.find({ resumeId: id }).select("_id").lean();
  const ids = commentIds.map((c) => c._id);
  if (ids.length > 0) {
    await CommentVote.deleteMany({ commentId: { $in: ids } });
    await Comment.deleteMany({ _id: { $in: ids } });
  }
  await Like.deleteMany({ resumeId: id });
  // Removed resume changed the owner's AI average / reaction totals — recompute.
  safeRecalcTalentScore(userId);
  return resume;
};

type ReactionMutationResult = {
  ownerId: string;
  viewerReaction: ResumeReactionType | null;
  likesCount: number;
  dislikesCount: number;
};

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}

async function applyReactionMutation(
  resumeId: string,
  userId: string,
  targetReaction: ResumeReactionType,
  session?: mongoose.ClientSession,
  retry = true,
): Promise<ReactionMutationResult> {
  const resumeQuery = Resume.findById(resumeId).select("userId likesCount dislikesCount");
  if (session) resumeQuery.session(session);
  const resume = await resumeQuery;
  if (!resume) throw ApiError.notfound("Resume not found");
  if (resume.userId.toString() === userId) throw ApiError.badRequest("You cannot react to your own resume.");

  const existingQuery = Like.findOne({ resumeId, userId }).select("reaction");
  if (session) existingQuery.session(session);
  const existing = await existingQuery;
  const prev = existing ? toViewerReaction((existing as any)?.reaction) : null;
  const next: ResumeReactionType | null = prev === targetReaction ? null : targetReaction;

  if (existing && !next) {
    const delQuery = Like.deleteOne({ _id: existing._id });
    if (session) delQuery.session(session);
    await delQuery;
  } else if (existing && next) {
    const upQuery = Like.updateOne({ _id: existing._id }, { $set: { reaction: next } });
    if (session) upQuery.session(session);
    await upQuery;
  } else if (!existing && next) {
    try {
      await Like.create([{ resumeId, userId, reaction: next }], { session });
    } catch (err) {
      // A concurrent request from the same user inserted the Like row between
      // our read and our create. Retry the whole mutation once so we recompute
      // `prev`/`next` and the counter deltas against the now-existing row.
      if (!isDuplicateKeyError(err) || !retry) throw err;
      return applyReactionMutation(resumeId, userId, targetReaction, session, false);
    }
  }

  const prevLike = prev === "like" ? 1 : 0;
  const prevDislike = prev === "dislike" ? 1 : 0;
  const nextLike = next === "like" ? 1 : 0;
  const nextDislike = next === "dislike" ? 1 : 0;
  const likesDelta = nextLike - prevLike;
  const dislikesDelta = nextDislike - prevDislike;

  // Mongoose 9+ requires an explicit opt-in for aggregation-pipeline updates.
  const updated = await Resume.findByIdAndUpdate(
    resumeId,
    [
      {
        $set: {
          likesCount: { $max: [0, { $add: [{ $ifNull: ["$likesCount", 0] }, likesDelta] }] },
          dislikesCount: { $max: [0, { $add: [{ $ifNull: ["$dislikesCount", 0] }, dislikesDelta] }] },
        },
      },
    ],
    { new: true, session, updatePipeline: true } as mongoose.QueryOptions,
  ).select("userId likesCount dislikesCount");

  if (!updated) throw ApiError.notfound("Resume not found");
  return {
    ownerId: updated.userId.toString(),
    viewerReaction: next,
    likesCount: Math.max(0, Number(updated.likesCount) || 0),
    dislikesCount: Math.max(0, Number((updated as any).dislikesCount) || 0),
  };
}

export const reactToResume = async (resumeId: string, userId: string, reaction: ResumeReactionType) => {
  if (!REACTION_VALUES.includes(reaction)) throw ApiError.badRequest("Invalid reaction");

  let result: ReactionMutationResult | null = null;
  const session = await mongoose.startSession();
  try {
    try {
      await session.withTransaction(async () => {
        result = await applyReactionMutation(resumeId, userId, reaction, session);
      });
    } catch (err) {
      if (!isTransactionUnavailable(err)) throw err;
      // Local/dev Mongo instances may not support transactions. Fall back to a
      // single-writer mutation path while keeping the same business semantics.
      result = await applyReactionMutation(resumeId, userId, reaction);
    }
  } finally {
    await session.endSession();
  }

  if (!result) throw ApiError.conflict("Could not persist reaction");
  safeRecalcTalentScore(result.ownerId);
  return {
    viewerReaction: result.viewerReaction,
    isLiked: result.viewerReaction === "like",
    isDisliked: result.viewerReaction === "dislike",
    likesCount: result.likesCount,
    dislikesCount: result.dislikesCount,
  };
};

// Backward-compat route behavior: /like still toggles like on/off.
export const toggleLike = async (resumeId: string, userId: string) => reactToResume(resumeId, userId, "like");
