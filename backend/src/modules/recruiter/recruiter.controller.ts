import * as recruiterService from "./recruiter.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";
import type { Request, Response } from "express";

export const searchCandidates = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role !== "recruiter") {
    throw ApiError.forbidden("Recruiter role required");
  }

  const skills = req.query.skills as string | undefined;
  const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined;
  const minTalentScore = req.query.minTalentScore ? parseInt(req.query.minTalentScore as string, 10) : undefined;
  const role = req.query.role as string | undefined;

  const candidates = await recruiterService.searchCandidates({ skills, minScore, minTalentScore, role });
  ApiResponse.ok(res, "Candidates fetched", candidates);
};

export const getCandidateProfile = async (req: Request, res: Response) => {
  const authUser = (req as any).user;
  if (authUser.role !== "recruiter") {
    throw ApiError.forbidden("Recruiter role required");
  }
  const data = await recruiterService.getCandidateProfile(req.params.userId as string);
  ApiResponse.ok(res, "Candidate profile", data);
};
