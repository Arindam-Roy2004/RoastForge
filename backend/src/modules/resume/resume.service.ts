import Resume from "./resume.model.js";
import Like from "./like.model.js";
import ApiError from "../../common/utils/api-error.js";
import mongoose from "mongoose";

const PAGE_SIZE = 12;

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
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { blurb: { $regex: search, $options: "i" } },
    ];
  }

  let sortObj: any = { createdAt: -1 };
  if (sort === "hot") sortObj = { likesCount: -1, commentsCount: -1, createdAt: -1 };
  if (sort === "top") sortObj = { likesCount: -1, createdAt: -1 };

  const total = await Resume.countDocuments(filter);
  const resumes = await populateUser(
    Resume.find(filter).sort(sortObj).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
  );

  // Attach liked status for authenticated viewer
  let likedIds: Set<string> = new Set();
  if (viewerId) {
    const likes = await Like.find({ resumeId: { $in: resumes.map((r) => r._id) }, userId: viewerId }).select("resumeId");
    likedIds = new Set(likes.map((l) => l.resumeId.toString()));
  }

  return {
    resumes: resumes.map((r) => ({
      ...r.toObject(),
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

  return { ...resume.toObject(), isLiked };
};

export const getMyResumes = async (userId: string) => {
  return populateUser(Resume.find({ userId }).sort({ createdAt: -1 }));
};

export const createResume = async (
  userId: string,
  data: { name: string; blurb?: string; fileUrl: string; fileType: "pdf" | "image" },
) => {
  return Resume.create({ userId, ...data });
};

export const updateResume = async (
  id: string,
  userId: string,
  data: { name?: string; blurb?: string },
) => {
  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) throw ApiError.notfound("Resume not found or not yours");
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
