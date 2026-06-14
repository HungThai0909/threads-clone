"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth.service";

import {
  resetPasswordSchema,
  ResetPasswordFormData,
} from "@/validators/auth.validator";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token,
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token) {
      setTokenError("Liên kết không hợp lệ. Không tìm thấy mã token xác thực.");
      setIsVerifyingToken(false);
      return;
    }

    setValue("token", token);

    const verifyToken = async () => {
      try {
        const res = await authService.verifyResetToken(token);
        if (res.success && res.data) {
          const data = res.data as any;
          setUserEmail(data.email);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          "Liên kết này đã hết hạn hoặc không tồn tại.";
        setTokenError(msg);
      } finally {
        setIsVerifyingToken(false);
      }
    };

    verifyToken();
  }, [token, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      const res = await authService.resetPassword(
        data.token,
        data.password,
        data.confirmPassword,
      );
      if (res.success) {
        setIsSuccess(true);
        toast.success("Thay đổi mật khẩu thành công!");
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
      toast.error(msg);
    }
  };

  if (isVerifyingToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-75 gap-3">
        <Spinner size="lg" className="text-[#f3f3f3]" />
        <p className="text-sm text-[#777]">Đang xác thực liên kết của bạn...</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="text-center py-6 animate-fade-in">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-[#f3f3f3] mb-2">
          Không thể đặt lại mật khẩu
        </h1>
        <p className="text-sm text-[#777] max-w-sm mx-auto mb-6 leading-relaxed">
          {tokenError}
        </p>
        <Button
          onClick={() => router.push("/forgot-password")}
          className="h-10 rounded-xl px-5"
        >
          Yêu cầu gửi lại liên kết mới
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center py-6 animate-fade-in">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-xl font-bold text-[#f3f3f3] mb-2">
          Cập nhật thành công!
        </h1>
        <p className="text-sm text-[#777] mb-6">
          Mật khẩu của bạn đã được thay đổi. Hệ thống đang chuyển hướng về trang
          Đăng nhập...
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="h-10 rounded-xl px-6 bg-[#f3f3f3] text-[#101010] hover:bg-[#e3e3e3]"
        >
          Đăng nhập ngay
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-center text-[#f3f3f3] mb-1">
        Thiết lập mật khẩu mới
      </h1>
      <p className="text-center text-[#777] text-sm mb-8">
        Đang thay đổi mật khẩu cho tài khoản:{" "}
        <span className="text-[#f3f3f3] font-medium">{userEmail}</span>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register("token")} />

        <div className="relative">
          <Input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu mới (Tối thiểu 8 ký tự, 1 chữ HOA, 1 số)"
            autoComplete="new-password"
            className="pr-11 rounded-xl h-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#f3f3f3] transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="relative">
          <Input
            {...register("confirmPassword")}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Xác nhận mật khẩu mới"
            autoComplete="new-password"
            className="pr-11 rounded-xl h-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#f3f3f3] transition-colors"
          >
            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-xl mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner size="sm" /> : "Xác nhận đổi mật khẩu"}
        </Button>
      </form>
    </div>
  );
}
