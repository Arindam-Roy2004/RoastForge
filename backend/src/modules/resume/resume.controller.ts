import * as resumeService from "./resume.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response } from "express";

const p = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

export const listResumes = async (req: Request, res: Response) => {
  const page = parseInt(String(req.query.page || "1"), 10);
  const sort = (req.query.sort as "new" | "hot" | "top") || "new";
  const search = req.query.search as string | undefined;
  const viewerId = (req as any).user?.id;
  const data = await resumeService.listResumes({ page, sort, search, viewerId });
  ApiResponse.ok(res, "Resumes fetched", data);
};

export const getResume = async (req: Request, res: Response) => {
  const viewerId = (req as any).user?.id;
  const resume = await resumeService.getResumeById(p(req.params.id), viewerId);
  ApiResponse.ok(res, "Resume fetched", resume);
};

export const getMyResumes = async (req: Request, res: Response) => {
  const resumes = await resumeService.getMyResumes((req as any).user.id);
  ApiResponse.ok(res, "My resumes", resumes);
};

export const createResume = async (req: Request, res: Response) => {
  const { name, blurb, fileUrl, fileType } = req.body;
  const resume = await resumeService.createResume((req as any).user.id, { name, blurb, fileUrl, fileType });
  ApiResponse.created(res, "Resume uploaded", resume);
};

export const updateResume = async (req: Request, res: Response) => {
  const resume = await resumeService.updateResume(p(req.params.id), (req as any).user.id, req.body);
  ApiResponse.ok(res, "Resume updated", resume);
};

export const deleteResume = async (req: Request, res: Response) => {
  await resumeService.deleteResume(p(req.params.id), (req as any).user.id);
  ApiResponse.ok(res, "Resume deleted");
};

export const toggleLike = async (req: Request, res: Response) => {
  const result = await resumeService.toggleLike(p(req.params.id), (req as any).user.id);
  ApiResponse.ok(res, result.liked ? "Liked" : "Unliked", result);
};
