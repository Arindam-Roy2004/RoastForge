import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import authRoute from "./modules/auth/auth.routes.js";
import resumeRoute from "./modules/resume/resume.routes.js";
import commentRoute from "./modules/comment/comment.routes.js";
import uploadRoute from "./modules/upload/upload.routes.js";
import analysisRoute from "./modules/analysis/analysis.routes.js";
import projectRoute from "./modules/project/project.routes.js";
import recruiterRoute from "./modules/recruiter/recruiter.routes.js";
import { errorHandler } from "./common/middleware/error.middleware.js";
import { sanitizeBody } from "./common/middleware/security.middleware.js";

/** Comma-separated FRONTEND_ORIGIN (e.g. prod + previews). Required on Vercel for split deploys. */
function allowedBrowserOrigins(): string[] {
  const raw = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

const app = express();

// Keep CORP loose so Cloudinary-hosted resume/avatar images load in the browser.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      const allowed = allowedBrowserOrigins();
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeBody);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "roastforge-api" });
});

app.use("/api/auth", authRoute);
app.use("/api/resumes", resumeRoute);
app.use("/api/comments", commentRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/analysis", analysisRoute);
app.use("/api/project", projectRoute);
app.use("/api/recruiter", recruiterRoute);

app.use(errorHandler);

export default app;
