import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class UpdateProfileDto extends BaseDto {
    static schema = Joi.object({
        displayName: Joi.string().max(120).allow("").optional(),
        linkedInUrl: Joi.string().uri({ scheme: ["http", "https"] }).allow("").optional(),
        githubUrl: Joi.string().uri({ scheme: ["http", "https"] }).allow("").optional(),
        shareIdentityWithRecruiters: Joi.boolean().optional(),
        // Candidate-declared target role — free text, displayed as entered, searched case-insensitively.
        targetRole: Joi.string().max(80).allow("").optional(),
        // Skills list — array of short tokens. Normalized (lowercase/trim) in the service before persisting.
        skills: Joi.array().items(Joi.string().trim().max(40)).max(25).optional(),
    }).min(1);
}
