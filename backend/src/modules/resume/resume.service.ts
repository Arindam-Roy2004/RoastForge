import Resume from "./resume.model.js";
import Like from "./like.model.js";
import ApiError from "../../common/utils/api-error.js";
import mongoose from "mongoose";

const PAGE_SIZE = 8;

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
  const resumes = await populateUser(query);

  // Attach liked status for authenticated viewer
  let likedIds: Set<string> = new Set();
  if (viewerId) {
    const likes = await Like.find({ resumeId: { $in: resumes.map((r) => r._id) }, userId: viewerId }).select("resumeId");
    likedIds = new Set(likes.map((l) => l.resumeId.toString()));
  }

  return {
    resumes: resumes.map((r) => ({
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

export const createResume = async (
  userId: string,
  data: { title: string; name: string; blurb?: string; fileUrl: string; fileType: "pdf" | "image" },
) => {
  return Resume.create({ userId, ...data });
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
  // Cleanup likes
  await Like.deleteMany({ resumeId: id });
  return resume;
};

export const toggleLike = async (resumeId: string, userId: string) => {
  const existing = await Like.findOne({ resumeId, userId });
  if (existing) {
    await existing.deleteOne();
    await Resume.findByIdAndUpdate(resumeId, { $inc: { likesCount: -1 } });
    return { liked: false };
  } else {
    await Like.create({ resumeId, userId });
    await Resume.findByIdAndUpdate(resumeId, { $inc: { likesCount: 1 } });
    return { liked: true };
  }
};
