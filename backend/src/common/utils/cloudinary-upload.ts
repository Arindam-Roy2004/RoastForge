import { v2 as cloudinary } from "cloudinary";

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
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        resource_type: opts.resourceType,
        public_id: opts.publicId,
        format: opts.format,
        type: "upload" // explicit public upload
      },
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
  return uploadFile(buffer, {
    folder: "roasthub/resumes",
    resourceType: "image", // Must use 'image' so it doesn't force 'attachment' download
    publicId: `${userId}-${Date.now()}`,
    format: "pdf",         // Ensures the .pdf extension is appended automatically
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
