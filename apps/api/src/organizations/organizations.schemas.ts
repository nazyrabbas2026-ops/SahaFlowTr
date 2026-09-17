import { z } from "zod";

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  roleId: z.string().cuid(),
});
export const updateMemberSchema = z.object({
  roleId: z.string().cuid(),
  active: z.boolean().optional(),
});
export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  permissions: z.array(z.string().min(1).max(100)).min(1).max(100),
});

export const notificationListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["all", "unread"]).default("all"),
});

export const updateNotificationSchema = z.object({
  read: z.boolean(),
});
