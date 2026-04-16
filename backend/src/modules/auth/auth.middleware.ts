import jwt from "jsonwebtoken";
import ApiError from "../../common/utils/api-error.js";
import { verifyAccessToken } from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

/** Resumes upload, projects, and candidate resume APIs only. */
export const requireCandidate = (req: any, res: any, next: any) => {
  if (req.user?.role === "recruiter") {
    return next(ApiError.forbidden("Recruiter accounts cannot use this action."));
  }
  next();
};

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized("Not authenticated");
    const token = header.split(" ")[1];
    const decoded = verifyAccessToken(token) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized("User no longer exists");
    req.user = { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, role: user.role };
    next();
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      next(ApiError.unauthorized("Invalid or expired token"));
      return;
    }
    next(e);
  }
};

// Optional auth — attaches user if a valid token is provided. Bad / expired
// tokens are silently ignored so anonymous browsing still works, but database
// or unexpected errors must propagate.
export const optionalAuth = async (req: any, _res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const token = header.split(" ")[1];
      const decoded = verifyAccessToken(token) as { id: string };
      const user = await User.findById(decoded.id);
      if (user) req.user = { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, role: user.role };
    }
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("optionalAuth: ignoring invalid token", err.message);
      }
      next();
      return;
    }
    next(err);
  }
};
