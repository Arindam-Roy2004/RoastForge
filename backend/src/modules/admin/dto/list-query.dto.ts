import Joi from "joi";
import { BaseDto } from "../../../common/dto/base.dto.js";

export const USER_FILTERS = ["all", "candidates", "recruiters", "admins", "suspended"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

const page = Joi.number().integer().min(1).max(10_000).default(1);
const search = Joi.string().trim().max(100).allow("").default("");

export class ListQueryDto extends BaseDto {
  static schema = Joi.object({ page, search });
}

export class ListUsersQueryDto extends BaseDto {
  static schema = Joi.object({
    page,
    search,
    filter: Joi.string().valid(...USER_FILTERS).default("all"),
  });
}
