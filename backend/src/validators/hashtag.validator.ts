import { z } from "zod";

export const createHashtagSchema = z.object({
  name: z
    .string()
    .min(1, "Hashtag name is required")
    .max(100, "Hashtag name too long")
    .transform((val) => val.replace(/^#/, "").toLowerCase().trim())
    .refine((val) => /^[a-z0-9_]+$/.test(val), {
      message:
        "Hashtag can only contain lowercase letters, numbers, and underscores",
    }),
});
