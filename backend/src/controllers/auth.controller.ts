import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";
import { UnauthorizedError } from "../utils/errors";
import {
  RegisterInput,
  ResetPasswordInput,
  ResendVerificationInput,
} from "../validators/auth.validator";

interface AuthenticatedRequest extends Request {
  token?: string;
  tokenJti?: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullname: string;
    avatarUrl: string | null;
    isVerified: boolean;
    isEmailVerified: boolean;
  };
}

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.register(req.body as RegisterInput);
    res.status(201).json({
      success: true,
      message:
        "Đăng ký tài khoản thành công. Vui lòng kiểm tra hộp thư Gmail để kích hoạt.",
      data,
    });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    res.json({ success: true, message: "Đăng nhập thành công.", data });
  }),

  loginWithGoogle: asyncHandler(async (req: Request, res: Response) => {
    const { providerUserId, email, fullname, avatarUrl } = req.body;
    const data = await authService.loginWithGoogle({
      providerUserId,
      email,
      fullname,
      avatarUrl: avatarUrl || null,
    });
    res.json({
      success: true,
      message: "Đăng nhập bằng Google thành công.",
      data,
    });
  }),

  logout: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.token || !req.tokenJti)
      throw new UnauthorizedError("Không tìm thấy thông tin phiên làm việc.");
    await authService.logout(req.token, req.tokenJti);
    res.json({ success: true, message: "Đăng xuất thành công." });
  }),

  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res
        .status(400)
        .json({
          success: false,
          message: "Mã Refresh Token không được để trống.",
        });
    const data = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      message: "Gia hạn phiên làm việc thành công.",
      data,
    });
  }),

  getMe: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const data = await authService.getMe(req.user.id);
    res.json({
      success: true,
      message: "Lấy thông tin tài khoản thành công.",
      data,
    });
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    const token = req.query.token;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "Mã xác thực tài khoản không có cấu trúc hợp lệ hoặc đã hết hạn.",
      });
    }

    await authService.verifyEmail(token);
    return res.status(200).json({
      success: true,
      message:
        "Xác thực tài khoản Email thành công. Hiện tại bạn đã có thể đăng nhập.",
    });
  }),

  resendVerificationEmail: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body as ResendVerificationInput;
    await authService.resendVerificationEmail(email);
    res.json({
      success: true,
      message:
        "Mã xác thực mới đã được gửi thành công vào hòm thư Gmail của bạn.",
    });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    res.json({
      success: true,
      message: "Nếu Email tồn tại, một liên kết khôi phục đã được gửi đi.",
    });
  }),

  verifyResetToken: asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Mã khôi phục mật khẩu là bắt buộc.",
        });
    }
    const data = await authService.verifyResetToken(token);
    res.json({
      success: true,
      message: "Xác thực mã khôi phục thành công.",
      data,
    });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body as ResetPasswordInput;
    await authService.resetPassword(token, password);
    res.json({ success: true, message: "Thay đổi mật khẩu mới thành công." });
  }),

  changePassword: asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) throw new UnauthorizedError();
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword,
      );
      res.json({
        success: true,
        message: "Đổi mật khẩu tài khoản thành công.",
      });
    },
  ),
};