import crypto from "crypto";
import jwt, { type JwtPayload, type Secret, type SignOptions } from "jsonwebtoken";

const accessSecret = (): Secret => process.env.JWT_ACCESS_SECRET as Secret;
const refreshSecret = (): Secret => process.env.JWT_REFRESH_SECRET as Secret;

const generateAccessToken = (payload: object) => {
  const opts = {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as string) || "15m",
  } as SignOptions;
  return jwt.sign(payload, accessSecret(), opts);
};

const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, accessSecret());
  if (typeof decoded === "string") throw new Error("Invalid token payload");
  return decoded;
};

const generateRefreshToken = (payload: object) => {
  const opts = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as string) || "7d",
  } as SignOptions;
  return jwt.sign(payload, refreshSecret(), opts);
};

const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, refreshSecret());
  if (typeof decoded === "string") throw new Error("Invalid token payload");
  return decoded;
};

const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  return { rawToken, hashedToken };
};

export { generateResetToken, verifyAccessToken, verifyRefreshToken, generateAccessToken, generateRefreshToken };
