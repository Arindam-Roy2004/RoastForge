import type { NextFunction, Request, Response } from "express";
import ApiError from "../utils/api-error.js";

export const errorHandler = (
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large" });
  }
  if (err.message === "Only PDF files are allowed") {
    return res.status(400).json({ success: false, message: err.message });
  }

  const statusCode = err instanceof ApiError ? err.statusCode : err.statusCode || 500;
  const message =
    err instanceof ApiError ? err.message : err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && !(err instanceof ApiError)
      ? { stack: err.stack }
      : {}),
  });
};
