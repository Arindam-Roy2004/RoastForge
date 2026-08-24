import mongoose from "mongoose";
import Resume from "../resume/resume.model.js";
import User from "../auth/auth.model.js";
import Project from "../project/project.model.js";
import ApiError from "../../common/utils/api-error.js";

/** Escape RegExp metacharacters so user input is safe to embed in a `$regex`. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchCandidates = async (opts: {
  skills?: string;
  minScore?: number;
  minTalentScore?: number;
  role?: string;
}) => {
  const resumeFilter: Record<string, unknown> = {};

  if (opts.minScore) {
    resumeFilter["aiRoast.score"] = { $gte: opts.minScore };
  }

  // Candidate-declared fields live on User.publicProfile. Build a User-level filter
  // and resolve matching ids first, so the Resume aggregation is only run over
  // eligible users — cheaper than joining then filtering post-hoc.
  const userFilter: Record<string, unknown> = {};
  if (opts.minTalentScore) userFilter["talentMetrics.composite"] = { $gte: opts.minTalentScore };

  if (opts.role && opts.role.trim()) {
    // Partial, case-insensitive match: "Backend" should match "Backend Engineer".
    userFilter["publicProfile.targetRole"] = { $regex: escapeRegex(opts.role.trim()), $options: "i" };
  }

  if (opts.skills && opts.skills.trim()) {
    // Split comma-list into normalized tokens and require *any* to match (union).
    // Skills are stored lowercased so exact $in beats regex for speed and index use.
    const terms = opts.skills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
    if (terms.length > 0) {
      userFilter["publicProfile.skills"] = { $in: terms };
    }
  }

  const userFilterNeeded = Object.keys(userFilter).length > 0;
  if (userFilterNeeded) {
    const matchingUsers = await User.find(userFilter).select("_id").lean();
    const ids = matchingUsers.map((u) => u._id);
    if (ids.length === 0) return [];
    resumeFilter.userId = { $in: ids };
  }

  // One row per CANDIDATE, not per resume. If the same user has multiple
  // matching resumes, we surface only their top-scoring one on the card and
  // expose `resumeCount` so the recruiter knows there's more to explore on
  // the candidate's portfolio page. Without this collapse, a prolific uploader
  // with N resumes would consume N of the 50 result slots, pushing real
  // candidates off the first page.
  const pipeline: mongoose.PipelineStage[] = [
    { $match: resumeFilter },
    // Sort first so `$first` inside `$group` picks the best resume per user.
    { $sort: { "aiRoast.score": -1, createdAt: -1 } },
    {
      $group: {
        _id: "$userId",
        resumeId: { $first: "$_id" },
        aiScore: { $first: "$aiRoast.score" },
        createdAt: { $first: "$createdAt" },
        resumeCount: { $sum: 1 },
      },
    },
    // Re-sort after grouping: candidates ranked by their best resume's score.
    { $sort: { aiScore: -1, createdAt: -1 } },
    { $limit: 50 },
    {
      $lookup: {
        from: User.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ];

  type AggRow = {
    _id: mongoose.Types.ObjectId;
    resumeId: mongoose.Types.ObjectId;
    aiScore?: number;
    resumeCount: number;
    user?: {
      _id: mongoose.Types.ObjectId;
      name?: string;
      avatar?: string;
      anonymousUsername?: string;
      publicProfile?: {
        displayName?: string;
        linkedInUrl?: string;
        githubUrl?: string;
        shareIdentityWithRecruiters?: boolean;
        targetRole?: string;
        skills?: string[];
      };
      talentMetrics?: { composite?: number };
    };
  };

  const rows = await Resume.aggregate<AggRow>(pipeline);

  return rows.map((r) => {
    const user = r.user;
    const shareIdentity = user?.publicProfile?.shareIdentityWithRecruiters;

    return {
      resumeId: r.resumeId,
      candidateUserId: user?._id ? String(user._id) : undefined,
      aiScore: r.aiScore !== undefined ? { overall: r.aiScore } : undefined,
      userId: user ? { anonymousUsername: user.anonymousUsername } : undefined,
      candidateAlias: user?.anonymousUsername,
      talentComposite: user?.talentMetrics?.composite ?? 0,
      // Count of this candidate's resumes that matched the current filter set
      // (`aiRoast.score >= minScore`, belonging to a user that passed the User
      // filter, etc.). Lets the UI render "3 matching resumes" so the recruiter
      // knows there's more to explore on the candidate's portfolio page.
      resumeCount: r.resumeCount ?? 1,
      // Expose candidate-declared role/skills so recruiter cards can show *why* the match fired.
      targetRole: user?.publicProfile?.targetRole || undefined,
      skills: Array.isArray(user?.publicProfile?.skills) ? user.publicProfile.skills.slice(0, 10) : [],
      identity: shareIdentity
        ? {
            displayName: user?.publicProfile?.displayName || undefined,
            linkedInUrl: user?.publicProfile?.linkedInUrl || undefined,
            githubUrl: user?.publicProfile?.githubUrl || undefined,
          }
        : null,
    };
  });
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
    targetRole: user.publicProfile?.targetRole || "",
    skills: Array.isArray(user.publicProfile?.skills) ? user.publicProfile.skills : [],
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
