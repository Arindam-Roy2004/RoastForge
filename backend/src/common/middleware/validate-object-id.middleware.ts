import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import ApiError from "../utils/api-error.js";

/**
 * Rejects requests whose route params contain an invalid ObjectId before
 * they reach a Mongoose query that would throw an opaque CastError.
 */
export const validateObjectIdParam = (name: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.params[name];
    if (!value || !mongoose.isValidObjectId(value)) {
      return next(ApiError.badRequest(`Invalid ${name}`));
    }
    next();
  };
};
