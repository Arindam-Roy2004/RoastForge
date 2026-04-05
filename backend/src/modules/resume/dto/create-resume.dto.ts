import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class CreateResumeDto extends BaseDto {
    static schema = Joi.object({
        name: Joi.string().max(120).required(),
        blurb: Joi.string().max(500).allow("").optional(),
        fileUrl: Joi.string().uri().required(),
        fileType: Joi.string().valid("pdf", "image").required(),
    });
}
