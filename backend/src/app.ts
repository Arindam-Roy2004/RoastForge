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

// Every Vercel PR preview gets a unique hostname (e.g. `frontend-git-feat-x-user.vercel.app`),
// so exact-match CORS would reject them. Opt-in via ALLOW_VERCEL_PREVIEWS=true so we don't
// accidentally trust previews in environments where they shouldn't be allowed.
const VERCEL_PREVIEW_RE = /^https:\/\/[\w-]+\.vercel\.app$/;
function isAllowedOrigin(origin: string): boolean {
  if (allowedBrowserOrigins().includes(origin)) return true;
  if (process.env.ALLOW_VERCEL_PREVIEWS === "true" && VERCEL_PREVIEW_RE.test(origin)) return true;
  return false;
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
      // Same-origin / curl / server-to-server have no Origin header — always allow.
      if (!origin) {
        callback(null, true);
        return;
      }
      if (isAllowedOrigin(origin)) {
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
