import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class DeleteAccountDto extends BaseDto {
  static schema = Joi.object({
    // Typed-email confirmation in lieu of a password, since accounts authenticate
    // via Google and have no password to compare. The service does a case-insensitive
    // exact match against the account's stored email.
    confirmEmail: Joi.string().email({ tlds: false }).required(),
  });
}
