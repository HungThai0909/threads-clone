import { z } from "zod";

export const createConversationSchema = z.object({
  participantIds: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parsed = Number(val);
        return isNaN(parsed) ? [] : [parsed];
      }
      if (Array.isArray(val)) {
        return val.map((id) => Number(id)).filter((id) => !isNaN(id));
      }
      return val;
    },
    z
      .array(z.number().int().positive())
      .min(1, "Phải có ít nhất 1 thành viên tham gia"),
  ),

  name: z.string().max(100).optional(),

  isGroup: z.preprocess((val) => {
    if (val === "true" || val === true) return true;
    if (val === "false" || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
});

export const sendMessageSchema = z
  .object({
    conversationId: z.preprocess(
      (val) => (val ? Number(val) : undefined),
      z.number().int().positive("Mã cuộc hội thoại không hợp lệ"),
    ),

    content: z.string().max(2000).optional(),

    replyToMessageId: z.preprocess(
      (val) =>
        val && val !== "null" && val !== "undefined" ? Number(val) : undefined,
      z.number().int().positive().optional(),
    ),
  })
  .refine((data) => {
    return true;
  }, {});
