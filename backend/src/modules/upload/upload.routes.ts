import { Router } from "express";
import { authenticate } from "../auth/auth.middleware.js";
import { upload } from "../../common/middleware/upload.middleware.js";
import { asyncHandler } from "../../common/middleware/async-handler.js";
import { uploadResumePdf, uploadResumeImage, uploadAvatar } from "../../common/utils/cloudinary-upload.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";

const router = Router();

router.post(
  "/resume",
  authenticate,
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
