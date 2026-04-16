import mongoose from "mongoose";
import app from "../src/app.js";
import connectDB from "../src/common/config/db.js";
import { assertEnv } from "../src/common/config/env.js";

export default async function handler(req: any, res: any) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  const isHealth = path === "/health" || path.endsWith("/health");

  try {
    assertEnv();
  } catch (err) {
    console.error((err as Error).message);
    res.status(503).json({ success: false, message: "Server misconfigured." });
    return;
  }

  if (!isHealth && !process.env.MONGODB_URI) {
    res.status(503).json({
      success: false,
      message: "Database not configured. Set MONGODB_URI on the server.",
    });
    return;
  }

  // connectDB() is idempotent: reuses the warm connection across invocations and
  // transparently reconnects when Mongoose reports `disconnected`.
  if (!isHealth && mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      console.error("MongoDB connection failed:", err);
      res.status(503).json({
        success: false,
        message: "Database temporarily unavailable.",
      });
      return;
    }
  }

  return app(req, res);
}
