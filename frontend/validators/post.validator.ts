import { z } from "zod";

const VISIBILITY = ["public", "followers", "private"] as const;

const basePostSchema = z.object({
  content: z
    .string()
    .max(500, "Bài viết tối đa 500 ký tự")
    .optional()
    .or(z.literal("")), 
  visibility: z.enum(VISIBILITY).default("public"),
});

export const createPostSchema = basePostSchema;

export const updatePostSchema = z.object({
  content: z
    .string()
    .min(1, "Nội dung không được bỏ trống")
    .max(500, "Bài viết tối đa 500 ký tự"),
});

export const replyPostSchema = basePostSchema;
export const quotePostSchema = basePostSchema;

export type CreatePostInput = z.infer<typeof createPostSchema>;