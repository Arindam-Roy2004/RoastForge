import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class CreateProjectDto extends BaseDto {
    static schema = Joi.object({
        title: Joi.string().max(200).required(),
        description: Joi.string().max(2000).allow("").default(""),
        techStack: Joi.array().items(Joi.string().trim()).default([]),
        githubUrl: Joi.string().uri().allow("").default(""),
        liveDemo: Joi.string().uri().allow("").default(""),
    });
}
