import Joi from "joi";
import { BaseDto } from "../../common/dto/base.dto.js";

/**
 * POST /api/upload/sign/resume — body shape.
 * Folder and public_id are decided server-side, so the browser only tells us
 * whether it's a pdf or image. contentType is echoed back into dev logs.
 */
export default class SignResumeUploadDto extends BaseDto {
  static schema = Joi.object({
    fileType: Joi.string().valid("pdf", "image").required(),
    contentType: Joi.string().max(120).optional(),
  });
}
