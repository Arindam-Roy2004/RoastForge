import crypto from "crypto";
import User from "./auth.model.js";
import ApiError from "../../common/utils/api-error.js";
import { generateAnonymousUsername } from "../../common/utils/anonymous-username.util.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const register = async ({ name, email, password, role }: { name: string; email: string; password: string; role?: string }) => {
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("Email already exists");

  const anonymousUsername = generateAnonymousUsername();
  const user = await User.create({
    name, email, password, anonymousUsername,
    role: role === "recruiter" ? "recruiter" : "user",
  });

  return {
    user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, anonymousUsername: user.anonymousUsername, role: user.role },
  };
};

export const login = async ({ email, password }: { email: string; password: string }) => {
  const user = await User.findOne({ email }).select("+password +refreshToken");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  const match = await (user as any).comparePassword(password);
  if (!match) throw ApiError.unauthorized("Invalid email or password");

  const accessToken = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  return {
    user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, anonymousUsername: user.anonymousUsername, role: user.role },
    accessToken, refreshToken,
  };
};

export const refresh = async (token: string) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");
  let decoded: { id: string };
  try {
    decoded = verifyRefreshToken(token) as { id: string };
  } catch {
    throw ApiError.unauthorized("Invalid refresh token");
  }
  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user) throw ApiError.unauthorized("Invalid refresh token");

  // Reuse detection: a presented token whose hash doesn't match the stored one
  // means either it was revoked or stolen and replayed. Wipe the stored hash so
  // the legitimate session is forced to log in again.
  if (user.refreshToken !== hashToken(token)) {
    user.refreshToken = undefined as unknown as string;
    await user.save({ validateBeforeSave: false });
    throw ApiError.unauthorized("Refresh token reuse detected");
  }

  // Rotate: issue a fresh refresh token and persist its hash so the old one stops working.
  const accessToken = generateAccessToken({ id: user._id });
  const newRefreshToken = generateRefreshToken({ id: user._id });
  user.refreshToken = hashToken(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
};

export const getMe = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notfound("User not found");
  // Recruiters have no talent score (they don't upload resumes/projects).
  // Omitting the field lets the client conditionally render without extra role checks.
  const isRecruiter = user.role === "recruiter";
  return {
    id: user._id, name: user.name, email: user.email, avatar: user.avatar,
    anonymousUsername: user.anonymousUsername, role: user.role,
    publicProfile: user.publicProfile,
    ...(isRecruiter ? {} : { talentMetrics: user.talentMetrics }),
  };
};

export const updateAvatar = async (userId: string, avatar: string) => {
  const user = await User.findByIdAndUpdate(userId, { avatar }, { returnDocument: "after" });
  if (!user) throw ApiError.notfound("User not found");
  return { id: user._id, name: user.name, email: user.email, avatar: user.avatar, anonymousUsername: user.anonymousUsername };
};

/** Normalize user-entered skills to a deduped, lowercased, trimmed list. */
function normalizeSkills(raw: string[] | undefined): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim().toLowerCase();
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= 25) break;
  }
  return out;
}

export const updateProfile = async (
  userId: string,
  data: {
    displayName?: string;
    linkedInUrl?: string;
    githubUrl?: string;
    shareIdentityWithRecruiters?: boolean;
    targetRole?: string;
    skills?: string[];
  },
) => {
  // Need the role first so we can filter out candidate-only fields for recruiters
  // (target role, skills, and the "share identity with recruiters" toggle are
  // meaningless for accounts that never appear in candidate search results).
  const existing = await User.findById(userId).select("role").lean();
  if (!existing) throw ApiError.notfound("User not found");
  const isRecruiter = existing.role === "recruiter";

  const update: Record<string, unknown> = {};
  if (data.displayName !== undefined) update["publicProfile.displayName"] = data.displayName;
  if (data.linkedInUrl !== undefined) update["publicProfile.linkedInUrl"] = data.linkedInUrl;
  if (data.githubUrl !== undefined) update["publicProfile.githubUrl"] = data.githubUrl;

  if (!isRecruiter) {
    if (data.shareIdentityWithRecruiters !== undefined) update["publicProfile.shareIdentityWithRecruiters"] = data.shareIdentityWithRecruiters;
    if (data.targetRole !== undefined) update["publicProfile.targetRole"] = data.targetRole.trim();
    if (data.skills !== undefined) {
      const normalized = normalizeSkills(data.skills);
      if (normalized) update["publicProfile.skills"] = normalized;
    }
  }

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { returnDocument: "after" });
  if (!user) throw ApiError.notfound("User not found");
  return { publicProfile: user.publicProfile };
};

export const regenerateUsername = async (userId: string) => {
  const newUsername = generateAnonymousUsername();
  
  const updatedUser = await User.findByIdAndUpdate(
    userId, 
    { anonymousUsername: newUsername }, 
    { returnDocument: "after" }
  );

  if (!updatedUser) throw ApiError.notfound("User not found");

  return { anonymousUsername: updatedUser.anonymousUsername };
};

export const deleteAccount = async (userId: string, password: string) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw ApiError.notfound("User not found");

  const match = await (user as any).comparePassword(password);
  if (!match) throw ApiError.unauthorized("Invalid password");

  await User.findByIdAndDelete(userId);
};
