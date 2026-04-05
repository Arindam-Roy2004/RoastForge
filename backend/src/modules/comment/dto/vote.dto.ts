import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export default class VoteDto extends BaseDto {
    static schema = Joi.object({
        voteType: Joi.string().valid("upvote", "downvote").required(),
    });
}
