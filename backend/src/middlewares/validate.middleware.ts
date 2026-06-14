import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import fs from "fs/promises";

export const validate = (
  schema: ZodSchema,
  target: "body" | "query" | "params",
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      try {
        const deletePromises: Promise<void>[] = [];

        if (req.file) {
          deletePromises.push(fs.unlink(req.file.path));
        }

        if (req.files) {
          const filesArray = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();

          filesArray.forEach((file: Express.Multer.File) => {
            deletePromises.push(fs.unlink(file.path));
          });
        }

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      } catch (uploadError) {
        console.error("Lỗi trong quá trình dọn dẹp file rác:", uploadError);
      }

      return res.status(400).json({
        success: false,
        message: "Dữ liệu yêu cầu không hợp lệ.",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    Object.assign(req[target], result.data);

    next();
  };
};
