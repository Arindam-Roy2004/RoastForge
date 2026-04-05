import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/api-error.js";
import { BaseDto } from "../dto/base.dto.js";

const validate = (DtoClass: typeof BaseDto) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { errors, value } = DtoClass.validate(req.body);
        if (errors) {
            throw ApiError.badRequest(errors.join("; "));
        }
        req.body = value;
        next();
    };
};

export default validate;