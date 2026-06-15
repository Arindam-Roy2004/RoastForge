import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class DetectPiiDto extends BaseDto {
    static schema = Joi.object({
        text: Joi.string().min(1).max(40000).required(),
    });
}
