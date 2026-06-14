import { z } from "zod";

export const updateProfileSchema = z.object({
  fullname: z
    .string()
    .max(100)
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: "Fullname cannot be empty" })
    .optional(),
  bio: z
    .string()
    .max(160, "Bio max 160 characters")
    .transform((val) => val.trim())
    .optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username max 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores")
    .transform((val) => val.trim())
    .optional(),
});
