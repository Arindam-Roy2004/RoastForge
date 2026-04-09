import * as projectService from "./project.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response } from "express";

export const listProjects = async (req: Request, res: Response) => {
  const projects = await projectService.listProjects((req as any).user.id);
  ApiResponse.ok(res, "Projects fetched", projects);
};

export const createProject = async (req: Request, res: Response) => {
  const project = await projectService.createProject((req as any).user.id, req.body);
  ApiResponse.created(res, "Project created", project);
};

export const deleteProject = async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.id as string, (req as any).user.id);
  ApiResponse.ok(res, "Project deleted");
};
