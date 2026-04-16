import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class GoogleLoginDto extends BaseDto {
  static schema = Joi.object({
    // Google ID tokens are JWTs; we don't validate the signature here (the service
    // does that with the official client). Bound the size to avoid DoS via giant payloads.
    credential: Joi.string().min(20).max(8192).required(),
  });
}
