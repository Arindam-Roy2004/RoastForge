import crypto from "crypto";

/**
 * Generate a SHA-256 fingerprint of resume text.
 * Normalises whitespace so minor formatting tweaks don't trigger a new AI call.
 */
export const generateContentHash = (text: string): string => {
  const normalised = text.replace(/\s+/g, " ").trim().toLowerCase();
  return crypto.createHash("sha256").update(normalised).digest("hex");
};
