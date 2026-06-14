import { z } from "zod";

const VISIBILITY = ["public", "followers", "private"] as const;

const basePostSchema = z.object({
  content: z.string().max(500, "Post max 500 characters").optional(),
  visibility: z.enum(VISIBILITY).default("public"),
});

export const createPostSchema = basePostSchema;

export const updatePostSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(500, "Post max 500 characters"),
});

export const replyPostSchema = basePostSchema.extend({
  
  parentId: z.number().int().positive().optional().nullable(),
});
export const quotePostSchema = basePostSchema;
