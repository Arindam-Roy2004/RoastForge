import type { Request, Response } from "express";
import * as adminService from "./admin.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import ApiError from "../../common/utils/api-error.js";
import type { BaseDto } from "../../common/dto/base.dto.js";
import { ListQueryDto, ListUsersQueryDto } from "./dto/list-query.dto.js";

/** `validate()` only covers bodies; query strings go through the same DTOs here. */
function parseQuery<T>(Dto: typeof BaseDto, query: unknown): T {
  const { errors, value } = Dto.validate(query);
  if (errors) throw ApiError.badRequest(errors.join("; "));
  return value as T;
}

const actorId = (req: Request) => (req as any).user.id as string;

export const overview = async (_req: Request, res: Response) => {
  ApiResponse.ok(res, "Overview", await adminService.getOverview());
};

export const listUsers = async (req: Request, res: Response) => {
  const opts = parseQuery<Parameters<typeof adminService.listUsers>[0]>(ListUsersQueryDto, req.query);
  ApiResponse.ok(res, "Users", await adminService.listUsers(opts));
};

export const getUser = async (req: Request, res: Response) => {
  ApiResponse.ok(res, "User", await adminService.getUser(req.params.userId as string));
};

export const updateUser = async (req: Request, res: Response) => {
  const user = await adminService.updateUser(actorId(req), req.params.userId as string, req.body);
  ApiResponse.ok(res, "User updated", user);
};

export const deleteUser = async (req: Request, res: Response) => {
  await adminService.deleteUser(actorId(req), req.params.userId as string, req.body.confirmEmail);
  ApiResponse.ok(res, "User deleted");
};

export const listResumes = async (req: Request, res: Response) => {
  const opts = parseQuery<Parameters<typeof adminService.listResumes>[0]>(ListQueryDto, req.query);
  ApiResponse.ok(res, "Resumes", await adminService.listResumes(opts));
};

export const deleteResume = async (req: Request, res: Response) => {
  await adminService.removeResume(actorId(req), req.params.resumeId as string);
  ApiResponse.ok(res, "Resume deleted");
};

export const listComments = async (req: Request, res: Response) => {
  const opts = parseQuery<Parameters<typeof adminService.listComments>[0]>(ListQueryDto, req.query);
  ApiResponse.ok(res, "Comments", await adminService.listComments(opts));
};

export const deleteComment = async (req: Request, res: Response) => {
  await adminService.removeComment(actorId(req), req.params.commentId as string);
  ApiResponse.ok(res, "Comment deleted");
};
