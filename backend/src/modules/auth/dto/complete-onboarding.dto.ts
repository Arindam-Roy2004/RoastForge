import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class CompleteOnboardingDto extends BaseDto {
  static schema = Joi.object({
    role: Joi.string().valid("user", "recruiter").required(),
  });
}
