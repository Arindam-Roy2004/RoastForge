import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class CommentBodyDto extends BaseDto {
    static schema = Joi.object({
        text: Joi.string().required().trim(),
        parentId: Joi.string().hex().length(24).optional(),
    });
}
