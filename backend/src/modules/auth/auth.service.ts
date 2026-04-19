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

/**
 * Serialises the persisted avatar preferences onto the client-facing user
 * payload. Kept in one place so response shapes stay consistent across
 * getMe, updateAvatar, completeOnboarding, and Google login.
 */
export const pickAvatarPrefs = (user: {
  preferredAvatarStyle?: unknown;
  preferredAvatarBackgroundColor?: unknown;
  preferredAvatarFlip?: unknown;
  preferredAvatarRotate?: unknown;
  preferredAvatarRadius?: unknown;
  preferredAvatarScale?: unknown;
}) => ({
  preferredAvatarStyle: (user.preferredAvatarStyle as string | null) ?? null,
  preferredAvatarBackgroundColor: (user.preferredAvatarBackgroundColor as string | null) ?? null,
  preferredAvatarFlip: Boolean(user.preferredAvatarFlip),
  preferredAvatarRotate: Number(user.preferredAvatarRotate ?? 0),
  preferredAvatarRadius: Number(user.preferredAvatarRadius ?? 0),
  preferredAvatarScale: Number(user.preferredAvatarScale ?? 100),
});

/**
 * Issues a fresh access + refresh token pair for a user document, persisting the
 * SHA-256 hash of the refresh token so we can detect reuse on the next refresh.
 * Shared between Google login and refresh-token rotation.
 */
export const issueTokensFor = async (user: { _id: unknown } & { refreshToken?: string | null; save: (opts?: unknown) => Promise<unknown> }) => {
  const accessToken = generateAccessToken({ id: user._id as string });
  const refreshToken = generateRefreshToken({ id: user._id as string });
  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
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
    ...pickAvatarPrefs(user),
    publicProfile: user.publicProfile,
    // Onboarding flag drives the post-Google role-picker redirect on the client.
    onboardingCompleted: user.onboardingCompleted,
    ...(isRecruiter ? {} : { talentMetrics: user.talentMetrics }),
  };
};

export const updateAvatar = async (userId: string, avatar: string) => {
  const user = await User.findByIdAndUpdate(userId, { avatar }, { returnDocument: "after" });
  if (!user) throw ApiError.notfound("User not found");
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    anonymousUsername: user.anonymousUsername,
    ...pickAvatarPrefs(user),
  };
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

/**
 * Deletes the user's account. Confirmation is by typing the account email back —
 * Google-only auth means there's no password to compare against, and a typed
 * email is the standard low-friction confirmation for irreversible actions.
 */
export const deleteAccount = async (userId: string, confirmEmail: string) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notfound("User not found");

  const provided = (confirmEmail || "").trim().toLowerCase();
  if (!provided || provided !== user.email.toLowerCase()) {
    throw ApiError.badRequest("Email confirmation does not match");
  }

  await User.findByIdAndDelete(userId);
};

/**
 * Flips `onboardingCompleted` to true and stores the user's chosen role. Only
 * meaningful right after a fresh Google signup; subsequent calls are no-ops on
 * already-onboarded accounts (we still update the role if it changed).
 */
export const completeOnboarding = async (userId: string, role: "user" | "recruiter") => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { role, onboardingCompleted: true } },
    { returnDocument: "after" },
  );
  if (!user) throw ApiError.notfound("User not found");
  return {
    id: user._id, name: user.name, email: user.email, avatar: user.avatar,
    anonymousUsername: user.anonymousUsername, role: user.role,
    ...pickAvatarPrefs(user),
    onboardingCompleted: user.onboardingCompleted,
  };
};
