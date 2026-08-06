import type { Request, Response, NextFunction } from "express";
import Resume from "../resume/resume.model.js";
import { generateContentHash } from "../../common/utils/hash.js";
import { generateResumeRoast, normalizeRoastResult, detectPersonalInfo, type RoastResult } from "./analysis.service.js";
import redis from "../../common/config/redis.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";
import { safeRecalcTalentScore } from "../auth/talent-score.service.js";

/** How long roast results live in Redis (7 days in seconds) */
const CACHE_TTL = 60 * 60 * 24 * 7;

/**
 * Trims a roast down to the fields the UI actually renders: the score and the
 * five verdict bars.
 *
 * `roastText` is deliberately withheld. No screen displays it — it survives in
 * the model contract as the critique the model writes while scoring, which is
 * what keeps the numbers discriminating (there's no separate reasoning channel
 * when the response is forced to JSON). It's still hashed and persisted for the
 * owner's record; it just has no business crossing the wire to a client that
 * will throw it away.
 */
function toClientRoast(roast: RoastResult) {
  return { score: roast.score, verdictBars: roast.verdictBars };
}

/** Cap fetched PDF byte size before parsing to avoid memory blow-ups. */
const MAX_PDF_BYTES = 10 * 1024 * 1024;
/** Cap extracted text fed to the model to keep prompt size bounded. */
const MAX_RESUME_TEXT_CHARS = 32_000;
/** SSRF guard: only fetch PDFs from Cloudinary's CDN. */
const ALLOWED_PDF_HOSTS = new Set(["res.cloudinary.com"]);
/** Hard cap on PDF download time. */
const PDF_FETCH_TIMEOUT_MS = 15_000;

function assertAllowedHost(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw ApiError.badRequest("Invalid file URL");
  }
  if (parsed.protocol !== "https:") {
    throw ApiError.badRequest("Only HTTPS file URLs are allowed");
  }
  if (!ALLOWED_PDF_HOSTS.has(parsed.hostname)) {
    throw ApiError.badRequest("File URL host is not allowed");
  }
  return parsed;
}

/**
 * Fetch the PDF from Cloudinary and extract text using pdf-parse.
 * pdf-parse is imported dynamically because it has side-effects on import.
 */
async function extractTextFromPdf(url: string): Promise<string> {
  assertAllowedHost(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PDF_FETCH_TIMEOUT_MS);
  let pdfRes: globalThis.Response;
  try {
    pdfRes = await fetch(url, { signal: ctrl.signal });
  } catch (err: any) {
    if (err?.name === "AbortError") throw ApiError.badRequest("PDF fetch timed out");
    throw ApiError.badRequest("Failed to fetch PDF from storage");
  } finally {
    clearTimeout(timer);
  }
  if (!pdfRes.ok) throw ApiError.badRequest("Failed to fetch PDF from storage");

  const contentLength = Number(pdfRes.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_PDF_BYTES) {
    throw ApiError.badRequest("PDF too large to analyze");
  }

  const ab = await pdfRes.arrayBuffer();
  if (ab.byteLength > MAX_PDF_BYTES) {
    throw ApiError.badRequest("PDF too large to analyze");
  }
  const buffer = Buffer.from(ab);

  // Import inner lib directly — pdf-parse's index.js tries to open a test PDF on import
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdfParse = (mod as any).default ?? mod;
  const parsed = await pdfParse(buffer);
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
    const rawText = await extractTextFromPdf(resume.fileUrl);
    if (!rawText || rawText.trim().length < 20) {
      throw ApiError.badRequest("Could not extract enough text from this PDF to analyze.");
    }
    const resumeText = rawText.length > MAX_RESUME_TEXT_CHARS
      ? rawText.slice(0, MAX_RESUME_TEXT_CHARS)
      : rawText;

    // 2. Generate content hash
    const contentHash = generateContentHash(resumeText);
    const cacheKey = `roast:${id}:${contentHash}`;

    // 3. Check Redis cache
    const cached = await redis.get<RoastResult>(cacheKey);
    if (cached) {
      const norm = normalizeRoastResult(cached);
      return ApiResponse.ok(res, "Roast fetched (cached)", { cached: true, ...toClientRoast(norm) });
    }

    // 4. Cache miss — call Gemini AI
    const roastResult = await generateResumeRoast(resumeText);

    // 5. Store in Redis with TTL
    await redis.set(cacheKey, roastResult, { ex: CACHE_TTL });

    // 6. Also persist on the Resume document for quick reads
    resume.roastHash = contentHash;
    resume.aiRoast = roastResult;
    await resume.save();

    // Fresh AI score → recompute owner's composite talent score (non-blocking).
    safeRecalcTalentScore(resume.userId.toString());

    return ApiResponse.ok(res, "Roast generated", { cached: false, ...toClientRoast(roastResult) });
  } catch (error) {
    next(error);
  }
};


/**
 * Detects the candidate's name and location in resume text supplied by the
 * client, so the upload-flow editor can highlight them as editable fields.
 * Links, emails, and phone numbers are detected client-side (deterministic
 * patterns + PDF hyperlink annotations) and are not sent through the model.
 * The text is the user's own resume, extracted client-side; never persisted.
 */
export const detectPii = async (req: Request, res: Response) => {
  const text = req.body.text as string;
  const result = await detectPersonalInfo(text);
  return ApiResponse.ok(res, "Personal info detected", result);
};

/**
 * Public trial roast — lets a visitor try the product without an account.
 *
 * Nothing is stored. The PDF never leaves the visitor's browser: text is
 * extracted client-side and only that text is posted here, so there is no file
 * upload, no Cloudinary object, no Resume document, no User row, and therefore
 * nothing to clean up later or leak into the public gallery.
 *
 * Abuse controls live in the route definition (origin check, per-IP burst and
 * daily limits, global daily budget) rather than here, so this handler stays a
 * thin wrapper over the same model call signed-in users get. The Gemini key
 * stays server-side; the browser only ever receives the finished roast.
 *
 * Results are intentionally not written to the Redis roast cache. That cache is
 * keyed per resume id for owners, and anonymous text has no stable identity
 * worth caching — writing to it would let unauthenticated traffic grow a
 * store we never read.
 */
export const tryRoast = async (req: Request, res: Response) => {
  // Bounds and shape are already enforced by TryRoastDto; the slice is belt and
  // braces so this can never outgrow the signed-in prompt budget.
  const text = (req.body.text as string).slice(0, MAX_RESUME_TEXT_CHARS);

  const roastResult = await generateResumeRoast(text);

  return ApiResponse.ok(res, "Roast generated", { cached: false, ...toClientRoast(roastResult) });
};
