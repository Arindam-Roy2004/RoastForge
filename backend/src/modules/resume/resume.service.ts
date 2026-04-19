import Resume from "./resume.model.js";
import Like from "./like.model.js";
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

  // Attach liked status for authenticated viewer
  let likedIds: Set<string> = new Set();
  if (viewerId) {
    const likes = await Like.find({ resumeId: { $in: resumes.map((r: any) => r._id) }, userId: viewerId }).select("resumeId");
    likedIds = new Set(likes.map((l) => l.resumeId.toString()));
  }

  return {
    resumes: resumes.map((r: any) => ({
      ...stripPrivateRoastFields(r.toObject() as Record<string, unknown>),
      isLiked: likedIds.has(r._id.toString()),
    })),
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  };
};

export const getResumeById = async (id: string, viewerId?: string) => {
  const resume = await populateUser(Resume.findById(id));
  if (!resume) throw ApiError.notfound("Resume not found");

  let isLiked = false;
  if (viewerId) {
    isLiked = !!(await Like.findOne({ resumeId: id, userId: viewerId }));
  }

  const obj = resume.toObject() as Record<string, unknown>;
  const ownerId = resumeOwnerId(resume);
  const isOwner = Boolean(viewerId && viewerId === ownerId);
  const safe = isOwner ? obj : stripPrivateRoastFields(obj);

  return { ...safe, isLiked, isOwner };
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
  // Removed resume changed the owner's max AI score / like totals — recompute.
  safeRecalcTalentScore(userId);
  return resume;
};

export const toggleLike = async (resumeId: string, userId: string) => {
  // Try to remove an existing like atomically; if one existed, we toggled off.
  const removed = await Like.findOneAndDelete({ resumeId, userId });
  if (removed) {
    const resume = await Resume.findByIdAndUpdate(resumeId, { $inc: { likesCount: -1 } });
    if (resume) safeRecalcTalentScore(resume.userId.toString());
    return { liked: false };
  }
  try {
    await Like.create({ resumeId, userId });
    const resume = await Resume.findByIdAndUpdate(resumeId, { $inc: { likesCount: 1 } });
    if (resume) safeRecalcTalentScore(resume.userId.toString());
    return { liked: true };
  } catch (err: any) {
    // Duplicate key means a concurrent request already liked — treat as idempotent success.
    if (err?.code === 11000) return { liked: true };
    throw err;
  }
};
