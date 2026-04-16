import * as authService from "./auth.service.js";
import * as googleAuthService from "./google-auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response } from "express";

// Split Vercel deploys (frontend on a.*, API on b.*) need SameSite=None + Secure or the refresh cookie is never sent on fetch().
const isProd = process.env.NODE_ENV === "production";
const crossSiteCookies = process.env.CROSS_SITE_COOKIES === "true" || isProd;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd || crossSiteCookies,
  sameSite: (crossSiteCookies ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const google = async (req: Request, res: Response) => {
  // The frontend posts the Google ID token (a Google-signed JWT) it received
  // via Google Identity Services. We verify, link-or-create, then issue our own
  // session tokens — the rest of the API doesn't need to know about Google.
  const { credential } = req.body || {};
  const { user, accessToken, refreshToken } = await googleAuthService.loginWithGoogle(credential);
  res.cookie("refreshToken", refreshToken, COOKIE_OPTS);
  ApiResponse.ok(res, "Login successful", { user, accessToken });
};

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  try {
    const { accessToken, refreshToken: rotated } = await authService.refresh(token);
    res.cookie("refreshToken", rotated, COOKIE_OPTS);
    ApiResponse.ok(res, "Token refreshed", { accessToken });
  } catch (err) {
    // On any refresh failure (reuse, expiry, missing) we must clear the cookie so
    // the browser doesn't keep replaying a dead/compromised token.
    res.clearCookie("refreshToken", { path: "/", sameSite: COOKIE_OPTS.sameSite, secure: COOKIE_OPTS.secure });
    throw err;
  }
};

export const logout = async (req: Request, res: Response) => {
  await authService.logout((req as any).user.id);
  res.clearCookie("refreshToken", { path: "/", sameSite: COOKIE_OPTS.sameSite, secure: COOKIE_OPTS.secure });
  ApiResponse.ok(res, "Logged out");
};

export const getMe = async (req: Request, res: Response) => {
  const user = await authService.getMe((req as any).user.id);
  ApiResponse.ok(res, "Profile", user);
};

export const updateProfile = async (req: Request, res: Response) => {
  const result = await authService.updateProfile((req as any).user.id, req.body);
  ApiResponse.ok(res, "Profile updated", result);
};

export const completeOnboarding = async (req: Request, res: Response) => {
  const result = await authService.completeOnboarding((req as any).user.id, req.body.role);
  ApiResponse.ok(res, "Onboarding complete", { user: result });
};

export const regenerateUsername = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await authService.regenerateUsername(userId);
  ApiResponse.ok(res, "Username regenerated successfully", result);
};

export const deleteAccount = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  // Body shape changed from { password } to { confirmEmail } since Google-only
  // accounts have no password to compare against.
  await authService.deleteAccount(userId, req.body.confirmEmail);
  res.clearCookie("refreshToken", { path: "/", sameSite: COOKIE_OPTS.sameSite, secure: COOKIE_OPTS.secure });
  ApiResponse.ok(res, "Account deleted");
};
