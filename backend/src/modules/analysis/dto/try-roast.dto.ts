import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

/** Below this the model has nothing useful to work with. */
const MIN_TEXT_CHARS = 200;
/**
 * Tighter than the signed-in path's 32k cap. A trial caller is anonymous, so we
 * keep their prompt (and therefore their cost) small on purpose.
 */
const MAX_TEXT_CHARS = 20_000;

/**
 * Rejects padding that satisfies the length rule without being a resume —
 * "aaaa…", a wall of punctuation, or pasted binary. Purely a cost guard: it
 * runs before the AI call so junk never reaches the model.
 */
function looksLikeProse(text: string, helpers: Joi.CustomHelpers) {
  const letters = (text.match(/\p{L}/gu) ?? []).length;
  if (letters / text.length < 0.5) return helpers.error("string.notProse");

  const distinct = new Set(text.toLowerCase().replace(/\s/g, "")).size;
  if (distinct < 25) return helpers.error("string.notProse");

  // Real resumes are multi-line. A single unbroken run of characters is padding.
  const words = text.trim().split(/\s+/).length;
  if (words < 40) return helpers.error("string.notProse");

  return text;
}

/**
 * Public trial roast input. Text only — deliberately no URL field, so this
 * endpoint has zero server-side fetch surface (and therefore no SSRF risk).
 */
export default class TryRoastDto extends BaseDto {
  static schema = Joi.object({
    text: Joi.string()
      .trim()
      .min(MIN_TEXT_CHARS)
      .max(MAX_TEXT_CHARS)
      .custom(looksLikeProse)
      .required()
      .messages({
        "string.min": `We couldn't read enough text from that PDF (need at least ${MIN_TEXT_CHARS} characters). Scanned or image-only resumes won't work.`,
        "string.max": `That resume is too long for a free roast (max ${MAX_TEXT_CHARS.toLocaleString()} characters).`,
        "string.notProse": "That doesn't look like resume text. Try a different PDF.",
        "any.required": "Resume text is required.",
      }),
  });
}
