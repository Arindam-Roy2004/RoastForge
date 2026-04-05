import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import authRoute from "./modules/auth/auth.routes.js";
import resumeRoute from "./modules/resume/resume.routes.js";
import commentRoute from "./modules/comment/comment.routes.js";
import uploadRoute from "./modules/upload/upload.routes.js";
import { errorHandler } from "./common/middleware/error.middleware.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "roasthub-api" });
});

app.use("/api/auth", authRoute);
app.use("/api/resumes", resumeRoute);
app.use("/api/comments", commentRoute);
app.use("/api/upload", uploadRoute);

app.use(errorHandler);

export default app;
