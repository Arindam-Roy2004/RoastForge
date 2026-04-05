import multer from "multer";

const MAX = parseInt(process.env.UPLOAD_MAX_BYTES || `${10 * 1024 * 1024}`, 10); // 10MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"));
    }
  },
});
