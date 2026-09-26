import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class UpdateResumeDto extends BaseDto {
    static schema = Joi.object({
        title: Joi.string().max(200).optional(),
        name: Joi.string().max(120).optional(),
        blurb: Joi.string().max(2000).allow("").optional(),
    });
}
