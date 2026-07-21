import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const channelSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
  categoryId: z.string().optional(),
});

export const videoSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  channelId: z.string(),
  tagIds: z.array(z.string()).optional(),
});

export const broadcastOrderSchema = z.object({
  videoId: z.string(),
  channelId: z.string(),
  package: z.enum(["STARTER", "STANDARD", "PRO", "BUSINESS"]),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  videoId: z.string(),
  parentId: z.string().optional(),
});

export const reportSchema = z.object({
  videoId: z.string(),
  reason: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  category: z.string().optional(),
  page: z.number().int().positive().default(1),
});

export const analyticsFilterSchema = z.object({
  videoId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  period: z.enum(["day", "week", "month", "year"]).default("week"),
});
