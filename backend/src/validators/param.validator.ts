import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().transform((val, ctx) => {
    const parsed = Number(val);
    if (isNaN(parsed) || parsed <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ID yêu cầu phải là một số nguyên dương hợp lệ.",
      });
      return z.NEVER;
    }
    return parsed;
  }),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().transform((val, ctx) => {
    const parsed = Number(val);
    if (isNaN(parsed) || parsed <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mã cuộc trò chuyện (ID) phải là một số nguyên dương.",
      });
      return z.NEVER;
    }
    return parsed;
  }),
});

export const paginationQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).catch(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).catch(20).default(20),
    cursor: z.coerce.number().int().positive().optional().catch(undefined),
  })
  .passthrough();

export const hashtagNameParamSchema = z.object({
  name: z.string().transform((val) => {
    const decoded = decodeURIComponent(val);
    return decoded.replace(/^#/, "").toLowerCase().trim();
  }),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
