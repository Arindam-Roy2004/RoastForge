import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class CreateProjectDto extends BaseDto {
    static schema = Joi.object({
        title: Joi.string().max(200).required(),
        description: Joi.string().max(2000).allow("").default(""),
        techStack: Joi.array().items(Joi.string().trim()).default([]),
        // http(s) only: these render as hrefs on the recruiter's candidate page,
        // so a bare .uri() would let `javascript:` links through. Matches the
        // profile DTO.
        githubUrl: Joi.string().uri({ scheme: ["http", "https"] }).allow("").default(""),
        liveDemo: Joi.string().uri({ scheme: ["http", "https"] }).allow("").default(""),
    });
}
