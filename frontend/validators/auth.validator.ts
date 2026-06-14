import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Tên tài khoản phải từ 3 ký tự trở lên.")
    .max(30, "Tên tài khoản tối đa 30 ký tự.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Tên tài khoản chỉ được chứa chữ cái, số và dấu gạch dưới.",
    ),
  email: z
    .string()
    .min(1, "Vui lòng nhập Email.")
    .email("Định dạng Email không hợp lệ."),
  password: z
    .string()
    .min(8, "Mật khẩu phải từ 8 ký tự trở lên.")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất một chữ cái viết hoa.")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất một chữ số."),
  fullname: z.string().min(1, "Vui lòng nhập họ và tên.").max(100),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập Email.")
    .email("Định dạng Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập Email.")
    .email("Định dạng Email không hợp lệ."),
});

export const resendVerificationSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập Email.")
    .email("Định dạng Email không hợp lệ."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Mã Token không được để trống."),
    password: z
      .string()
      .min(8, "Mật khẩu mới phải từ 8 ký tự trở lên.")
      .regex(/[A-Z]/, "Mật khẩu mới phải chứa chữ hoa.")
      .regex(/[0-9]/, "Mật khẩu mới phải chứa chữ số."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận lại mật khẩu."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới phải từ 8 ký tự trở lên.")
      .regex(/[A-Z]/, "Mật khẩu mới phải chứa chữ hoa.")
      .regex(/[0-9]/, "Mật khẩu mới phải chứa chữ số."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận lại mật khẩu mới."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu mới xác nhận không trùng khớp.",
    path: ["confirmPassword"],
  });

export const googleLoginSchema = z.object({
  providerUserId: z.string().min(1, "Provider User ID bắt buộc phải có."),
  email: z.string().email("Định dạng Email không hợp lệ."),
  fullname: z.string().min(1, "Họ và tên không được để trống."),
  avatarUrl: z
    .string()
    .url("Định dạng đường dẫn ảnh không hợp lệ.")
    .nullable()
    .optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResendVerificationFormData = z.infer<
  typeof resendVerificationSchema
>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type GoogleLoginFormData = z.infer<typeof googleLoginSchema>;
