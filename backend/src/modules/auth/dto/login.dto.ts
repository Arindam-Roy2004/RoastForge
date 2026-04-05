import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class LoginDto extends BaseDto {
    static schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });
}
