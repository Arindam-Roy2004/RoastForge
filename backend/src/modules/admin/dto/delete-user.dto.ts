import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

/** Same typed-email confirmation the self-serve account deletion uses. */
export default class DeleteUserDto extends BaseDto {
  static schema = Joi.object({
    confirmEmail: Joi.string().trim().email().max(254).required(),
  });
}
