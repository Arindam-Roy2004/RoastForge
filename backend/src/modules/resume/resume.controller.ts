import * as resumeService from "./resume.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response } from "express";

const p = (v: string | string[]) => (Array.isArray(v) ? v[0] : v);

const VALID_SORTS = new Set(["new", "hot", "top"]);

export const listResumes = async (req: Request, res: Response) => {
  const rawPage = parseInt(String(req.query.page ?? "1"), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const sortParam = typeof req.query.sort === "string" ? req.query.sort : "new";
  const sort = (VALID_SORTS.has(sortParam) ? sortParam : "new") as "new" | "hot" | "top";
  const searchRaw = typeof req.query.search === "string" ? req.query.search : undefined;
  const search = searchRaw ? searchRaw.slice(0, 200) : undefined;
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
  const {
    title, name, blurb, fileUrl, fileType,
    avatarStyle, avatarSeed, avatarBackgroundColor, avatarFlip,
    avatarRotate, avatarRadius, avatarScale,
  } = req.body;
  const resume = await resumeService.createResume((req as any).user.id, {
    title, name, blurb, fileUrl, fileType,
    avatarStyle, avatarSeed, avatarBackgroundColor, avatarFlip,
    avatarRotate, avatarRadius, avatarScale,
  });
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
