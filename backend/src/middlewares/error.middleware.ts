import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      success: false,
      message: "Định dạng dữ liệu JSON gửi lên không đúng cú pháp.",
      code: "INVALID_JSON_SYNTAX",
    });
  }

  if (err instanceof ZodError) {
    const errors = Object.fromEntries(
      err.issues.map(({ path, message }) => {
        const fieldKey = path[0] !== undefined ? String(path[0]) : "global";
        return [fieldKey, message];
      }),
    );
    return res.status(400).json({
      success: false,
      message: "Dữ liệu form không hợp lệ, vui lòng kiểm tra lại.",
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.",
      code: "TOKEN_EXPIRED",
    });
  }
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Mã xác thực không hợp lệ hoặc cấu trúc token đã bị thay đổi.",
      code: "TOKEN_INVALID",
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.constructor.name.replace("Error", "").toUpperCase(),
    });
  }

  if ((err as { code?: string }).code === "P2002") {
    return res.status(409).json({
      success: false,
      message:
        "Dữ liệu này đã tồn tại trên hệ thống (Trùng Email/Username/Khóa chính).",
      code: "DB_DUPLICATE_RECORD",
    });
  }

  if ((err as { code?: string }).code === "P2025") {
    return res.status(404).json({
      success: false,
      message:
        "Yêu cầu thất bại do bản ghi không tồn tại hoặc đã bị xóa trước đó.",
      code: "DB_RECORD_NOT_FOUND",
    });
  }

  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Đã xảy ra lỗi hệ thống bất ngờ, vui lòng thử lại sau.",
    code: "INTERNAL_SERVER_ERROR",
  });
};
