import type { NextFunction, Request, Response } from "express";
import ApiError from "../utils/api-error.js";

type AnyErr = Error & {
  statusCode?: number;
  code?: string | number;
  name?: string;
  kind?: string;
};

export const errorHandler = (
  err: AnyErr,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Known multer error codes.
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large" });
  }
  if (err.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ success: false, message: err.message || "Invalid file type" });
  }

  // ApiError → honoured as-is, safe to expose its message.
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // Mongoose validation and cast errors: client input problem, 400 + generic message.
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid identifier" });
  }
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message: "Validation failed" });
  }
  // Mongo duplicate key.
  if (err.name === "MongoServerError" && err.code === 11000) {
    return res.status(409).json({ success: false, message: "Duplicate resource" });
  }

  // Log the raw error server-side but never leak internals to the client in production.
  console.error("Unhandled error:", err);

  const isProd = process.env.NODE_ENV === "production";
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  const body: Record<string, unknown> = {
    success: false,
    message: isProd ? "Internal server error" : err.message || "Internal server error",
  };
  if (!isProd) body.stack = err.stack;
  return res.status(statusCode).json(body);
};
