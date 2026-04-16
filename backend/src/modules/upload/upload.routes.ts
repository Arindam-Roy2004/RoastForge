import { Router } from "express";
import { authenticate, requireCandidate } from "../auth/auth.middleware.js";
import { upload } from "../../common/middleware/upload.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import validate from "../../common/middleware/validate.middleware.js";
import { uploadSignRateLimiter } from "../../common/middleware/security.middleware.js";
import {
  uploadResumePdf,
  uploadResumeImage,
  uploadAvatar,
  signResumeUpload,
} from "../../common/utils/cloudinary-upload.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";
import SignResumeUploadDto from "./upload.dto.js";

const router = Router();

/**
 * Direct-to-Cloudinary path. Client gets a short-lived signature, then POSTs
 * the file straight to Cloudinary — the Vercel function never sees the bytes,
 * which dodges the 4.5 MB request-body cap.
 */
router.post(
  "/sign/resume",
  authenticate,
  requireCandidate,
  uploadSignRateLimiter,
  validate(SignResumeUploadDto),
  asyncHandler(async (req: any, res: any) => {
    const { fileType, contentType } = req.body as { fileType: "pdf" | "image"; contentType?: string };
    const signed = signResumeUpload(req.user.id, fileType, contentType);
    ApiResponse.ok(res, "Upload signed", signed);
  }),
);

/**
 * Legacy / fallback path: file goes through the function. Kept for small files
 * and local dev. On Vercel this is capped by UPLOAD_MAX_BYTES (~4 MB) and the
 * platform's own request-body ceiling — prefer /sign/resume for anything real.
 */
router.post(
  "/resume",
  authenticate,
  requireCandidate,
  upload.single("file"),
  asyncHandler(async (req: any, res: any) => {
    if (!req.file?.buffer) throw ApiError.badRequest("No file uploaded");
    const mime = req.file.mimetype;
    const isPdf = mime === "application/pdf";
    const isImage = mime.startsWith("image/");

    if (!isPdf && !isImage) throw ApiError.badRequest("Only PDF and image files allowed");

    const url = isPdf
      ? await uploadResumePdf(req.file.buffer, req.user.id)
      : await uploadResumeImage(req.file.buffer, req.user.id, mime);

    ApiResponse.ok(res, "File uploaded", {
      fileUrl: url,
      fileType: isPdf ? "pdf" : "image",
    });
  }),
);

router.post(
  "/avatar",
  authenticate,
  upload.single("avatar"),
  asyncHandler(async (req: any, res: any) => {
    if (!req.file?.buffer) throw ApiError.badRequest("No file uploaded");
    if (!req.file.mimetype.startsWith("image/")) throw ApiError.badRequest("Only image files allowed");
    const url = await uploadAvatar(req.file.buffer, req.user.id);
    ApiResponse.ok(res, "Avatar uploaded", { avatarUrl: url });
  }),
);

export default router;
