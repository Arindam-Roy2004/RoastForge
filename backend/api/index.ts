import app from "../src/app.js";
import connectDB from "../src/common/config/db.js";

let dbConnected = false;

export default async function handler(req: any, res: any) {
  const path = typeof req.url === "string" ? req.url.split("?")[0] : "";
  const isHealth = path === "/health" || path.endsWith("/health");

  if (!isHealth && !process.env.MONGODB_URI) {
    res.status(503).json({
      success: false,
      message: "Database not configured. Set MONGODB_URI on the server.",
    });
    return;
  }

  if (!dbConnected && process.env.MONGODB_URI) {
    try {
      await connectDB();
      dbConnected = true;
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
