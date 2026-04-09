import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class RegisterDto extends BaseDto {
    static schema = Joi.object({
        name: Joi.string().min(2).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        role: Joi.string().valid("user", "recruiter").default("user"),
    });
}
