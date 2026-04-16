import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

// Only allow URLs served by our configured Cloudinary account so users cannot
// point the AI roast / PDF fetch at arbitrary hosts (SSRF mitigation).
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "[a-z0-9_-]+";
const cloudinaryUrl = new RegExp(`^https://res\\.cloudinary\\.com/${cloudName}/`);

export default class CreateResumeDto extends BaseDto {
    static schema = Joi.object({
        title: Joi.string().max(200).required(),
        name: Joi.string().max(120).required(),
        blurb: Joi.string().max(500).allow("").optional(),
        fileUrl: Joi.string().uri({ scheme: ["https"] }).pattern(cloudinaryUrl).required()
            .messages({ "string.pattern.base": "fileUrl must be a Cloudinary URL" }),
        fileType: Joi.string().valid("pdf", "image").required(),
    });
}
