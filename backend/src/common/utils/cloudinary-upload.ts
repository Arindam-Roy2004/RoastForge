import { v2 as cloudinary } from "cloudinary";
import type { UploadApiOptions } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function uploadFile(
  buffer: Buffer,
  opts: { folder: string; resourceType: "raw" | "image" | "auto"; publicId: string; format?: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadOpts: UploadApiOptions = {
      folder: opts.folder,
      resource_type: opts.resourceType,
      public_id: opts.publicId,
      type: "upload", // public delivery (not authenticated/private)
    };
    if (opts.format) uploadOpts.format = opts.format;

    const stream = cloudinary.uploader.upload_stream(
      uploadOpts,
      (err, result) => {
        if (err) reject(err);
        else if (!result?.secure_url) reject(new Error("No URL from Cloudinary"));
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

export async function uploadResumePdf(buffer: Buffer, userId: string): Promise<string> {
  // PDFs must use resource_type "raw". Delivering PDFs via /image/upload/ often hits ACL
  // restrictions (401 x-cld-error: deny or ACL failure) and breaks iframe/embed viewers.
  return uploadFile(buffer, {
    folder: "roasthub/resumes",
    resourceType: "raw",
    publicId: `${userId}-${Date.now()}.pdf`,
  });
}

export async function uploadResumeImage(buffer: Buffer, userId: string, mime: string): Promise<string> {
  const ext = mime.split("/")[1] || "jpg";
  return uploadFile(buffer, {
    folder: "roasthub/resumes",
    resourceType: "image",
    publicId: `${userId}-${Date.now()}`,
    format: ext,
  });
}

export async function uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
  return uploadFile(buffer, {
    folder: "roasthub/avatars",
    resourceType: "image",
    publicId: `avatar-${userId}`,
  });
}
