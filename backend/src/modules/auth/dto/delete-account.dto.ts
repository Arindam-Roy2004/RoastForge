import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class DeleteAccountDto extends BaseDto {
  static schema = Joi.object({
    password: Joi.string().required(),
  });
}
