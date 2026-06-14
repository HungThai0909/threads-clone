import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Nội dung bình luận không được để trống")
    .max(500, "Bình luận tối đa 500 ký tự"),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Nội dung cập nhật không được để trống")
    .max(500, "Bình luận tối đa 500 ký tự"),
});

export const getCommentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

export const createReplySchema = z.object({
  content: z
    .string()
    .min(1, "Nội dung phản hồi không được để trống")
    .max(500, "Phản hồi tối đa 500 ký tự"),
});

export const updateReplySchema = z.object({
  content: z
    .string()
    .min(1, "Nội dung cập nhật không được để trống")
    .max(500, "Phản hồi tối đa 500 ký tự"),
});
