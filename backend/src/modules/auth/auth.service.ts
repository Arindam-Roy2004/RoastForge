import crypto from "crypto";
import User from "./auth.model.js";
import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const register = async ({ name, email, password }: { name: string; email: string; password: string }) => {
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict("Email already exists");

  const user = await User.create({ name, email, password });
  const accessToken = generateAccessToken({ id: user._id });
  const refreshToken = generateRefreshToken({ id: user._id });

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  return { user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar }, accessToken, refreshToken };
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

  return { user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar }, accessToken, refreshToken };
};

export const refresh = async (token: string) => {
  if (!token) throw ApiError.unauthorized("Refresh token missing");
  const decoded = verifyRefreshToken(token) as { id: string };
  const user = await User.findById(decoded.id).select("+refreshToken");
  if (!user || user.refreshToken !== hashToken(token)) {
    throw ApiError.unauthorized("Invalid refresh token");
  }
  const accessToken = generateAccessToken({ id: user._id });
  return { accessToken };
};

export const logout = async (userId: string) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
};

export const getMe = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notfound("User not found");
  return { id: user._id, name: user.name, email: user.email, avatar: user.avatar };
};

export const updateAvatar = async (userId: string, avatar: string) => {
  const user = await User.findByIdAndUpdate(userId, { avatar }, { new: true });
  if (!user) throw ApiError.notfound("User not found");
  return { id: user._id, name: user.name, email: user.email, avatar: user.avatar };
};
