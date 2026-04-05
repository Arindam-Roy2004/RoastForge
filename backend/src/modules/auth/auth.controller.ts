import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response } from "express";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);
  res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
  ApiResponse.created(res, "Account created", { user, accessToken });
};

export const login = async (req: Request, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
  ApiResponse.ok(res, "Login successful", { user, accessToken });
};

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  const { accessToken } = await authService.refresh(token);
  ApiResponse.ok(res, "Token refreshed", { accessToken });
};

export const logout = async (req: Request, res: Response) => {
  await authService.logout((req as any).user.id);
  res.clearCookie("refreshToken");
  ApiResponse.ok(res, "Logged out");
};

export const getMe = async (req: Request, res: Response) => {
  const user = await authService.getMe((req as any).user.id);
  ApiResponse.ok(res, "Profile", user);
};

export const regenerateUsername = async (req: Request, res: Response) => {
  const userId = (req as any).user.id; 
  const result = await authService.regenerateUsername(userId);
  ApiResponse.ok(res, "Username regenerated successfully", result);
};

