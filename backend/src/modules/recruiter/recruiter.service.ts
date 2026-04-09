import mongoose from "mongoose";
import Resume from "../resume/resume.model.js";
import User from "../auth/auth.model.js";
import Project from "../project/project.model.js";
import ApiError from "../../common/utils/api-error.js";

export const searchCandidates = async (opts: {
  skills?: string;
  minScore?: number;
  minTalentScore?: number;
  role?: string;
}) => {
  const filter: any = {};

  if (opts.minScore) {
    filter["aiRoast.score"] = { $gte: opts.minScore };
  }

  // Fetch resumes with populated user info
  const resumes = await Resume.find(filter)
    .sort({ "aiRoast.score": -1, createdAt: -1 })
    .limit(50)
    .populate("userId", "name avatar anonymousUsername publicProfile talentMetrics");

  // Filter and map to candidate rows
  const rows = resumes.map((r) => {
    const user = r.userId as any;
    const shareIdentity = user?.publicProfile?.shareIdentityWithRecruiters;

    return {
      resumeId: r._id,
      candidateUserId: user?._id ? String(user._id) : undefined,
      aiScore: r.aiRoast ? { overall: r.aiRoast.score } : undefined,
      userId: user ? { anonymousUsername: user.anonymousUsername } : undefined,
      candidateAlias: user?.anonymousUsername,
      talentComposite: user?.talentMetrics?.composite ?? 0,
      identity: shareIdentity
        ? {
            displayName: user.publicProfile.displayName || undefined,
            linkedInUrl: user.publicProfile.linkedInUrl || undefined,
            githubUrl: user.publicProfile.githubUrl || undefined,
          }
        : null,
    };
  });

  // Apply talent score filter in-memory (it's on the User, not Resume)
  let filtered = rows;
  if (opts.minTalentScore) {
    filtered = rows.filter((r) => (r.talentComposite ?? 0) >= opts.minTalentScore!);
  }

  return filtered;
};

/** Full portfolio for recruiters: projects, public resumes, opt-in identity links. */
export const getCandidateProfile = async (candidateUserId: string) => {
  if (!mongoose.isValidObjectId(candidateUserId)) {
    throw ApiError.badRequest("Invalid user id");
  }

  const user = await User.findById(candidateUserId).select(
    "name avatar anonymousUsername publicProfile talentMetrics role",
  );
  if (!user) throw ApiError.notfound("User not found");
  if (user.role === "recruiter") {
    throw ApiError.badRequest("Profile is only available for candidates");
  }

  const share = user.publicProfile?.shareIdentityWithRecruiters;

  const [projects, resumes] = await Promise.all([
    Project.find({ userId: candidateUserId }).sort({ createdAt: -1 }).lean(),
    Resume.find({ userId: candidateUserId })
      .sort({ createdAt: -1 })
      .select({
        title: 1,
        blurb: 1,
        likesCount: 1,
        commentsCount: 1,
        createdAt: 1,
        "aiRoast.score": 1,
      })
      .lean(),
  ]);

  return {
    userId: user._id,
    anonymousUsername: user.anonymousUsername,
    avatar: user.avatar || "",
    talentComposite: user.talentMetrics?.composite ?? 0,
    identity: share
      ? {
          displayName: user.publicProfile?.displayName || user.name,
          linkedInUrl: user.publicProfile?.linkedInUrl || "",
          githubUrl: user.publicProfile?.githubUrl || "",
        }
      : null,
    projects: projects.map((p) => ({
      _id: p._id,
      title: p.title,
      description: p.description,
      techStack: p.techStack || [],
      githubUrl: p.githubUrl || "",
      liveDemo: p.liveDemo || "",
      aiStatus: p.aiStatus,
      aiEvaluation: p.aiEvaluation,
      createdAt: p.createdAt,
    })),
    resumes: resumes.map((r) => ({
      _id: r._id,
      title: r.title,
      blurb: r.blurb,
      likesCount: r.likesCount ?? 0,
      commentsCount: r.commentsCount ?? 0,
      createdAt: r.createdAt,
      aiScoreOverall: r.aiRoast?.score,
    })),
  };
};
