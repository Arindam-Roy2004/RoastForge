import type { Request, Response, NextFunction } from "express";
import Resume from "../resume/resume.model.js";
import { generateContentHash } from "../../common/utils/hash.js";
import { generateResumeRoast, normalizeRoastResult, type RoastResult } from "./analysis.service.js";
import redis from "../../common/config/redis.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";

/** How long roast results live in Redis (7 days in seconds) */
const CACHE_TTL = 60 * 60 * 24 * 7;

/**
 * Fetch the PDF from Cloudinary and extract text using pdf-parse.
 * pdf-parse is imported dynamically because it has side-effects on import.
 */
async function extractTextFromPdf(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw ApiError.badRequest("Failed to fetch PDF from storage");
  const buffer = Buffer.from(await res.arrayBuffer());

  // Polyfill DOMMatrix for pdf.js in Node.js environment
  if (typeof globalThis.DOMMatrix === "undefined") {
    (globalThis as any).DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(init?: number[] | string) {
        if (Array.isArray(init)) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init;
        }
      }
    };
  }

  // Dynamic import — handle CJS/ESM interop
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  return parsed.text;
}

export const analyzeResume = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const resume = await Resume.findById(id);

    if (!resume) throw ApiError.notfound("Resume not found");

    const requesterId = (req as any).user?.id as string | undefined;
    if (!requesterId || resume.userId.toString() !== requesterId) {
      throw ApiError.forbidden("Only the resume owner can run AI roast.");
    }

    if (resume.fileType !== "pdf") {
      throw ApiError.badRequest("AI roast is only available for PDF resumes. Image resumes cannot be analyzed.");
    }

    // 1. Extract text from the PDF
    const resumeText = await extractTextFromPdf(resume.fileUrl);
    if (!resumeText || resumeText.trim().length < 20) {
      throw ApiError.badRequest("Could not extract enough text from this PDF to analyze.");
    }

    // 2. Generate content hash
    const contentHash = generateContentHash(resumeText);
    const cacheKey = `roast:${id}:${contentHash}`;

    // 3. Check Redis cache
    const cached = await redis.get<RoastResult>(cacheKey);
    if (cached) {
      const norm = normalizeRoastResult(cached);
      return ApiResponse.ok(res, "Roast fetched (cached)", { cached: true, ...norm });
    }

    // 4. Cache miss — call Gemini AI
    const roastResult = await generateResumeRoast(resumeText);

    // 5. Store in Redis with TTL
    await redis.set(cacheKey, roastResult, { ex: CACHE_TTL });

    // 6. Also persist on the Resume document for quick reads
    resume.roastHash = contentHash;
    resume.aiRoast = roastResult;
    await resume.save();

    return ApiResponse.ok(res, "Roast generated", { cached: false, ...roastResult });
  } catch (error) {
    next(error);
  }
};
