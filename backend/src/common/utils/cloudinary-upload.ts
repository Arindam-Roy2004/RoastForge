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

/**
 * Params that should be part of the signed payload when uploading directly
 * from the browser. `file`, `api_key`, `resource_type`, and `cloud_name`
 * must NOT be signed (Cloudinary rejects the upload if they are).
 */
export type SignedUploadParams = {
  timestamp: number;
  folder: string;
  public_id: string;
};

export type SignedUploadResponse = {
  cloudName: string;
  apiKey: string;
  resourceType: "raw" | "image";
  uploadUrl: string;
  /** Passed back in the multipart body alongside `file`. */
  params: SignedUploadParams & { signature: string };
};

/**
 * Generates a short-lived Cloudinary upload signature so the browser can POST
 * the file directly. This sidesteps Vercel's ~4.5 MB function body limit and
 * offloads the CPU/memory cost of large PDFs entirely.
 *
 * The server is the only party that knows `CLOUDINARY_API_SECRET`, and it
 * decides the folder + public_id — the client can't target arbitrary paths
 * or overwrite other users' files.
 */
export function signResumeUpload(
  userId: string,
  fileType: "pdf" | "image",
  imageMime?: string,
): SignedUploadResponse {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "roasthub/resumes";
  // Mirror the server-upload naming so Cloudinary-hosted resumes share a layout
  // whether they went through the function or the direct path.
  const publicId =
    fileType === "pdf"
      ? `${userId}-${Date.now()}.pdf`
      : `${userId}-${Date.now()}`;
  const resourceType: "raw" | "image" = fileType === "pdf" ? "raw" : "image";

  const paramsToSign: SignedUploadParams = { timestamp, folder, public_id: publicId };
  // Cloudinary signature: SHA-1 of "key1=val1&key2=val2..." (keys alphabetized) + api_secret.
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${(paramsToSign as Record<string, unknown>)[k]}`)
    .join("&");
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  // `api_sign_request` reproduces the same string-to-sign internally; we keep
  // `toSign` only for the defensive log in dev.
  if (process.env.NODE_ENV !== "production" && !signature) {
    console.warn("Empty Cloudinary signature for params:", toSign);
  }

  // Suppress unused-var lint for the imageMime arg — reserved for future formats.
  void imageMime;

  return {
    cloudName,
    apiKey,
    resourceType,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    params: { ...paramsToSign, signature },
  };
}
