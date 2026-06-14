export class AppError extends Error {
  public statusCode: number;
  public isOperational = true;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(m = "Yêu cầu không hợp lệ.") {
    super(m, 400);
  }
}
export class UnauthorizedError extends AppError {
  constructor(m = "Phiên làm việc không hợp lệ hoặc đã hết hạn.") {
    super(m, 401);
  }
}
export class ForbiddenError extends AppError {
  constructor(m = "Bạn không có quyền thực hiện hành động này.") {
    super(m, 403);
  }
}
export class NotFoundError extends AppError {
  constructor(r = "Tài nguyên") {
    super(`${r} không tồn tại trên hệ thống.`, 404);
  }
}
export class ConflictError extends AppError {
  constructor(m = "Dữ liệu bị trùng lặp hoặc xảy ra xung đột.") {
    super(m, 409);
  }
}
export class TooManyRequestsError extends AppError {
  constructor(
    m = "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
  ) {
    super(m, 429);
  }
}
export class InternalServerError extends AppError {
  constructor(m = "Lỗi hệ thống nội bộ.") {
    super(m, 500);
  }
}
