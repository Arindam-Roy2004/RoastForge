import ApiError from "../../common/utils/api-error.js";
import { verifyAccessToken } from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

export const authenticate = async (req: any, res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw ApiError.unauthorized("Not authenticated");
    const token = header.split(" ")[1];
    const decoded = verifyAccessToken(token) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) throw ApiError.unauthorized("User no longer exists");
    req.user = { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar };
    next();
  } catch (e) {
    next(e);
  }
};

// Optional auth — attaches user if token provided, but doesn't block
export const optionalAuth = async (req: any, res: any, next: any) => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const token = header.split(" ")[1];
      const decoded = verifyAccessToken(token) as { id: string };
      const user = await User.findById(decoded.id);
      if (user) req.user = { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar };
    }
  } catch {}
  next();
};
