import mongoose from "mongoose";
import User from "../auth/auth.model.js";
import Resume from "../resume/resume.model.js";
import Comment from "../comment/comment.model.js";
import Project from "../project/project.model.js";
import AdminAudit, { type AdminAction } from "./admin-audit.model.js";
import ApiError from "../../common/utils/api-error.js";
import { escapeRegex } from "../recruiter/recruiter.service.js";
import { deleteResume } from "../resume/resume.service.js";
import { deleteComment } from "../comment/comment.service.js";
import { safeRecalcTalentScore } from "../auth/talent-score.service.js";
import type { UserFilter } from "./dto/list-query.dto.js";

const ADMIN_PAGE_SIZE = 20;

const USER_FIELDS = "name email anonymousUsername role isAdmin suspendedAt createdAt talentMetrics";
const OWNER_FIELDS = "name email anonymousUsername";

type Owner = { _id: mongoose.Types.ObjectId; name?: string; email?: string; anonymousUsername?: string };

type UserDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  anonymousUsername?: string;
  role?: string | null;
  isAdmin?: boolean | null;
  suspendedAt?: Date | null;
  createdAt?: Date;
  talentMetrics?: { composite?: number | null } | null;
};

const serializeOwner = (o: unknown) => {
  if (!o || typeof o !== "object" || !("_id" in o)) return null;
  const owner = o as Owner;
  return {
    id: String(owner._id),
    name: owner.name ?? "",
    email: owner.email ?? "",
    anonymousUsername: owner.anonymousUsername ?? "",
  };
};

const serializeUser = (u: UserDoc) => ({
  id: String(u._id),
  name: u.name ?? "",
  email: u.email ?? "",
  anonymousUsername: u.anonymousUsername ?? "",
  role: u.role === "recruiter" ? "recruiter" : "user",
  isAdmin: u.isAdmin === true,
  suspendedAt: u.suspendedAt ?? null,
  createdAt: u.createdAt ?? null,
  talentComposite: u.talentMetrics?.composite ?? 0,
});

const paginate = (page: number, total: number) => ({
  total,
  page,
  pages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
});

const containing = (search: string) => ({ $regex: escapeRegex(search), $options: "i" });

async function record(
  actorId: string,
  action: AdminAction,
  targetType: "user" | "resume" | "comment",
  targetId: mongoose.Types.ObjectId | string,
  targetLabel: string,
  detail = "",
) {
  await AdminAudit.create({
    actorId,
    action,
    targetType,
    targetId,
    targetLabel: targetLabel.slice(0, 200),
    detail,
  });
}

/**
 * Loads a user an admin is about to act on. Admin accounts are off-limits to
 * every panel action — including the caller's own — so one admin can never
 * suspend, demote or delete another, and no one can lock themselves out.
 * Admin status itself is managed only from the CLI.
 */
async function loadManageableUser(userId: string) {
  const target = await User.findById(userId).select(USER_FIELDS).lean<UserDoc>();
  if (!target) throw ApiError.notfound("User not found");
  if (target.isAdmin) throw ApiError.forbidden("Admin accounts can't be changed here");
  return target;
}

/**
 * Applies an update only while the target is still a non-admin, closing the
 * window between `loadManageableUser` and the write.
 */
async function updateManageableUser(userId: string, update: mongoose.UpdateQuery<unknown>) {
  const updated = await User.findOneAndUpdate({ _id: userId, isAdmin: { $ne: true } }, update, {
    returnDocument: "after",
  })
    .select(USER_FIELDS)
    .lean<UserDoc>();
  if (!updated) throw ApiError.conflict("User changed while saving. Reload and try again.");
  return updated;
}

// ─── Overview ────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
export const SERIES_DAYS = 14;

/** UTC `YYYY-MM-DD` keys for the last `SERIES_DAYS` days, oldest first, today last. */
function seriesDays(now: Date) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: SERIES_DAYS }, (_, i) =>
    new Date(today - (SERIES_DAYS - 1 - i) * DAY_MS).toISOString().slice(0, 10),
  );
}

/** Documents created per UTC day since `since`, keyed by `YYYY-MM-DD`. */
async function createdPerDay(model: mongoose.Model<any>, since: Date, match: Record<string, unknown> = {}) {
  const rows = await model.aggregate<{ _id: string; n: number }>([
    { $match: { ...match, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

/**
 * The last 7 days against the 7 before, read from the same daily buckets as
 * the chart so the trend figure and the bars can never disagree.
 */
const weekOverWeek = (values: number[]) => ({
  current: values.slice(-7).reduce((a, b) => a + b, 0),
  previous: values.slice(-14, -7).reduce((a, b) => a + b, 0),
});

export const getOverview = async () => {
  const days = seriesDays(new Date());
  const since = new Date(`${days[0]}T00:00:00.000Z`);

  const [users, recruiters, admins, suspended, resumes, comments, projects, userDays, resumeDays, commentDays, recent] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "recruiter" }),
      User.countDocuments({ isAdmin: true }),
      User.countDocuments({ suspendedAt: { $ne: null } }),
      Resume.countDocuments({}),
      Comment.countDocuments({ userId: { $ne: null } }),
      Project.countDocuments({}),
      createdPerDay(User, since),
      createdPerDay(Resume, since),
      createdPerDay(Comment, since, { userId: { $ne: null } }),
      AdminAudit.find({})
        .sort({ createdAt: -1 })
        .limit(12)
        .populate("actorId", OWNER_FIELDS)
        .lean(),
    ]);

  const series = days.map((date) => ({
    date,
    users: userDays.get(date) ?? 0,
    resumes: resumeDays.get(date) ?? 0,
    comments: commentDays.get(date) ?? 0,
  }));

  return {
    counts: { users, candidates: users - recruiters, recruiters, admins, suspended, resumes, comments, projects },
    weekly: {
      users: weekOverWeek(series.map((d) => d.users)),
      resumes: weekOverWeek(series.map((d) => d.resumes)),
      comments: weekOverWeek(series.map((d) => d.comments)),
    },
    series,
    activity: recent.map((a) => ({
      id: String(a._id),
      action: a.action,
      targetType: a.targetType,
      targetLabel: a.targetLabel,
      detail: a.detail,
      createdAt: a.createdAt,
      actor: serializeOwner(a.actorId),
    })),
  };
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const listUsers = async (opts: { page: number; search: string; filter: UserFilter }) => {
  const query: Record<string, unknown> = {};
  if (opts.filter === "candidates") query.role = "user";
  else if (opts.filter === "recruiters") query.role = "recruiter";
  else if (opts.filter === "admins") query.isAdmin = true;
  else if (opts.filter === "suspended") query.suspendedAt = { $ne: null };

  if (opts.search) {
    const rx = containing(opts.search);
    query.$or = [{ name: rx }, { email: rx }, { anonymousUsername: rx }];
  }

  const [total, rows] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((opts.page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .select(USER_FIELDS)
      .lean<UserDoc[]>(),
  ]);

  return { items: rows.map(serializeUser), ...paginate(opts.page, total) };
};

export const getUser = async (userId: string) => {
  const user = await User.findById(userId).select(USER_FIELDS).lean<UserDoc>();
  if (!user) throw ApiError.notfound("User not found");

  const [resumes, comments, projects] = await Promise.all([
    Resume.countDocuments({ userId }),
    Comment.countDocuments({ userId }),
    Project.countDocuments({ userId }),
  ]);

  return { ...serializeUser(user), counts: { resumes, comments, projects } };
};

export const updateUser = async (
  actorId: string,
  userId: string,
  change: { role?: "user" | "recruiter"; suspended?: boolean },
) => {
  const target = await loadManageableUser(userId);
  const label = target.email ?? "";

  if (change.role !== undefined) {
    if (target.role === change.role) return serializeUser(target);
    const updated = await updateManageableUser(userId, { $set: { role: change.role } });
    // Recruiters carry no talent score; a candidate coming back needs theirs rebuilt.
    safeRecalcTalentScore(userId);
    await record(actorId, "user.role", "user", target._id, label, `${target.role ?? "user"} → ${change.role}`);
    return serializeUser(updated);
  }

  const suspend = change.suspended === true;
  if (Boolean(target.suspendedAt) === suspend) return serializeUser(target);

  const updated = await updateManageableUser(
    userId,
    // Dropping the refresh hash ends every session the user has open; the
    // per-request suspension check in `authenticate` covers live access tokens.
    suspend
      ? { $set: { suspendedAt: new Date() }, $unset: { refreshToken: 1 } }
      : { $set: { suspendedAt: null } },
  );
  await record(actorId, suspend ? "user.suspend" : "user.reinstate", "user", target._id, label);
  return serializeUser(updated);
};

export const deleteUser = async (actorId: string, userId: string, confirmEmail: string) => {
  const target = await loadManageableUser(userId);
  if (confirmEmail.trim().toLowerCase() !== (target.email ?? "").toLowerCase()) {
    throw ApiError.badRequest("Email confirmation does not match");
  }

  // Goes through the model hook, so the same cascade as self-serve deletion runs.
  const deleted = await User.findOneAndDelete({ _id: userId, isAdmin: { $ne: true } });
  if (!deleted) throw ApiError.conflict("User changed while deleting. Reload and try again.");
  await record(actorId, "user.delete", "user", target._id, target.email ?? "");
};

// ─── Content ─────────────────────────────────────────────────────────────────

export const listResumes = async (opts: { page: number; search: string }) => {
  const query: Record<string, unknown> = {};
  if (opts.search) query.title = containing(opts.search);

  const [total, rows] = await Promise.all([
    Resume.countDocuments(query),
    Resume.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((opts.page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .select("title fileUrl likesCount dislikesCount commentsCount aiRoast.score userId createdAt")
      .populate("userId", OWNER_FIELDS)
      .lean(),
  ]);

  return {
    items: rows.map((r) => ({
      id: String(r._id),
      title: r.title,
      fileUrl: r.fileUrl,
      likesCount: Math.max(0, r.likesCount ?? 0),
      dislikesCount: Math.max(0, r.dislikesCount ?? 0),
      commentsCount: Math.max(0, r.commentsCount ?? 0),
      aiScore: r.aiRoast?.score ?? null,
      createdAt: r.createdAt,
      owner: serializeOwner(r.userId),
    })),
    ...paginate(opts.page, total),
  };
};

export const removeResume = async (actorId: string, resumeId: string) => {
  const resume = await Resume.findById(resumeId).select("title userId").lean();
  if (!resume) throw ApiError.notfound("Resume not found");
  await deleteResume(resumeId, String(resume.userId));
  await record(actorId, "resume.delete", "resume", resume._id, resume.title);
};

export const listComments = async (opts: { page: number; search: string }) => {
  // Tombstones have no author and no content left to moderate.
  const query: Record<string, unknown> = { userId: { $ne: null } };
  if (opts.search) query.text = containing(opts.search);

  const [total, rows] = await Promise.all([
    Comment.countDocuments(query),
    Comment.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((opts.page - 1) * ADMIN_PAGE_SIZE)
      .limit(ADMIN_PAGE_SIZE)
      .select("text parentId resumeId userId createdAt upvotesCount downvotesCount")
      .populate("userId", OWNER_FIELDS)
      .populate("resumeId", "title")
      .lean(),
  ]);

  return {
    items: rows.map((c) => {
      const resume = c.resumeId as unknown as { _id?: mongoose.Types.ObjectId; title?: string } | null;
      return {
        id: String(c._id),
        text: c.text,
        isReply: c.parentId != null,
        upvotesCount: c.upvotesCount ?? 0,
        downvotesCount: c.downvotesCount ?? 0,
        createdAt: c.createdAt,
        author: serializeOwner(c.userId),
        resume: resume?._id ? { id: String(resume._id), title: resume.title ?? "" } : null,
      };
    }),
    ...paginate(opts.page, total),
  };
};

export const removeComment = async (actorId: string, commentId: string) => {
  const comment = await Comment.findById(commentId).select("text userId").lean();
  if (!comment || !comment.userId) throw ApiError.notfound("Comment not found");
  // Same rules as an author deleting their own: replies from others keep the
  // node alive as a tombstone instead of being destroyed with it.
  await deleteComment(commentId, String(comment.userId));
  await record(actorId, "comment.delete", "comment", comment._id, comment.text.slice(0, 120));
};
