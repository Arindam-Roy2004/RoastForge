import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import authRoute from "./modules/auth/auth.routes.js";
import resumeRoute from "./modules/resume/resume.routes.js";
import commentRoute from "./modules/comment/comment.routes.js";
import uploadRoute from "./modules/upload/upload.routes.js";
import analysisRoute from "./modules/analysis/analysis.routes.js";
import projectRoute from "./modules/project/project.routes.js";
import recruiterRoute from "./modules/recruiter/recruiter.routes.js";
import { errorHandler } from "./common/middleware/error.middleware.js";
import { sanitizeBody } from "./common/middleware/security.middleware.js";
import { isAllowedBrowserOrigin } from "./common/config/origins.js";
import { resolveTrustProxy } from "./common/config/trust-proxy.js";
import ApiError from "./common/utils/api-error.js";

/** Mongoose `readyState` codes, mapped for human-readable health output. */
const MONGO_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const app = express();

app.set("trust proxy", resolveTrustProxy());

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
      if (isAllowedBrowserOrigin(origin)) {
        callback(null, true);
        return;
      }
      // An untrusted origin is a rejected client, not a server fault. Surfacing
      // it as an ApiError keeps the response a clean 403 and stops every drive-by
      // probe from being logged as an unhandled 500.
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`CORS blocked origin: ${origin}`);
      }
      callback(ApiError.forbidden("Origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeBody);

// Liveness: touches nothing external, so it stays honest during a DB outage.
// Used by the container HEALTHCHECK, where the only remedy is a restart — and a
// restart can't fix a dependency being down.
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "roastforge-api" });
});

// Readiness: reports whether the app can actually serve. 503 until Mongo is
// connected, so the deploy workflow can roll back instead of keeping a broken
// container in service.
app.get("/health/ready", (_req, res) => {
  const state = mongoose.connection.readyState;
  const dbConnected = state === 1;
  res.status(dbConnected ? 200 : 503).json({
    ok: dbConnected,
    service: "roastforge-api",
    checks: { mongo: MONGO_STATES[state] ?? `unknown(${state})` },
  });
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
