import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

/** One change per request, so each one lands as its own audit entry. */
export default class UpdateUserDto extends BaseDto {
  static schema = Joi.object({
    role: Joi.string().valid("user", "recruiter"),
    suspended: Joi.boolean(),
  }).xor("role", "suspended");
}
