import * as notificationService from "./notification.service.js";
import ApiResponse from "../../common/utils/api-response.js";
import type { Request, Response } from "express";

const userId = (req: Request): string => (req as any).user.id;
const idParam = (req: Request): string => req.params.id as string;

const MAX_PAGE = 50;
const DEFAULT_PAGE = 20;

export const list = async (req: Request, res: Response) => {
  const parsed = Number.parseInt(String(req.query.limit ?? ""), 10);
  const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), MAX_PAGE) : DEFAULT_PAGE;
  const cursor = typeof req.query.cursor === "string" && req.query.cursor ? req.query.cursor : undefined;
  const data = await notificationService.listNotifications(userId(req), {
    cursor,
    limit,
    unreadOnly: req.query.unread === "true",
  });
  ApiResponse.ok(res, "Notifications fetched", data);
};

export const unreadCount = async (req: Request, res: Response) => {
  const count = await notificationService.getUnreadCount(userId(req));
  ApiResponse.ok(res, "Unread count", { count });
};

export const markRead = async (req: Request, res: Response) => {
  await notificationService.markRead(userId(req), idParam(req));
  ApiResponse.ok(res, "Marked as read");
};

export const markAllRead = async (req: Request, res: Response) => {
  await notificationService.markAllRead(userId(req));
  ApiResponse.ok(res, "All marked as read");
};

export const remove = async (req: Request, res: Response) => {
  await notificationService.deleteNotification(userId(req), idParam(req));
  ApiResponse.ok(res, "Notification deleted");
};
