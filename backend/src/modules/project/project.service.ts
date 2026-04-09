import Project from "./project.model.js";
import ApiError from "../../common/utils/api-error.js";

export const listProjects = async (userId: string) => {
  return Project.find({ userId }).sort({ createdAt: -1 });
};

export const createProject = async (
  userId: string,
  data: { title: string; description?: string; techStack?: string[]; githubUrl?: string; liveDemo?: string },
) => {
  return Project.create({ userId, ...data });
};

export const deleteProject = async (id: string, userId: string) => {
  const project = await Project.findOneAndDelete({ _id: id, userId });
  if (!project) throw ApiError.notfound("Project not found or not yours");
  return project;
};
