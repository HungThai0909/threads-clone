"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth.service";
import { registerSchema, RegisterFormData } from "@/validators/auth.validator";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const res = await authService.register(data);
      if (res.success) {
        setRegisteredEmail(data.email);
        setRegistered(true);
        toast.success("Đăng ký tài khoản thành công!");
      }
    } catch (err: any) {
      const apiErrors = err?.response?.data?.errors;
      if (apiErrors) {
        const firstError = Array.isArray(apiErrors)
          ? apiErrors[0]?.message
          : Object.values(apiErrors)[0];
        toast.error(String(firstError));
      } else {
        toast.error(
          err?.response?.data?.message || "Đăng ký tài khoản thất bại.",
        );
      }
    }
  };

  const handleResendEmail = async () => {
    if (countdown > 0 || isResending) return;
    
    try {
      setIsResending(true);
      const res = await authService.resendVerification(registeredEmail);
      
      if (res.success) {
        toast.success("Đã gửi lại email xác thực thành công!");
        setCountdown(60);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể gửi lại email vào lúc này.");
    } finally {
      setIsResending(false);
    }
  };

  if (registered) {
    return (
      <div className="animate-fade-in text-center space-y-5 py-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#f3f3f3] border border-[#2a2a2a]">
            <MailCheck size={32} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#f3f3f3]">
            Kiểm tra hộp thư của bạn
          </h2>
          <p className="text-[#777] text-sm leading-relaxed max-w-xs mx-auto">
            Chúng tôi đã gửi một liên kết xác thực đến địa chỉ email <span className="text-[#f3f3f3] font-medium">{registeredEmail}</span>. Vui lòng kích hoạt tài khoản để tiếp tục.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <Button 
            type="button"
            variant="ghost" 
            onClick={handleResendEmail}
            disabled={isResending || countdown > 0}
            className="w-full text-xs text-[#777] hover:text-[#f3f3f3] transition-colors bg-transparent border border-[#2a2a2a] hover:bg-[#161616] h-10 rounded-xl"
          >
            {isResending ? (
              <Spinner size="sm" />
            ) : countdown > 0 ? (
              `Gửi lại liên kết sau (${countdown}s)`
            ) : (
              "Chưa nhận được Email? Gửi lại"
            )}
          </Button>

          <Link href="/login" className="block">
            <Button className="w-full h-11 bg-[#f3f3f3] text-[#101010] hover:bg-[#e3e3e3] rounded-xl font-medium transition-all">
              Đi đến trang Đăng nhập
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-center text-[#f3f3f3] mb-1">
        Tạo tài khoản mới
      </h1>
      <p className="text-center text-[#777] text-sm mb-8">
        Bạn đã có tài khoản rồi?{" "}
        <Link
          href="/login"
          className="text-[#f3f3f3] hover:underline font-medium"
        >
          Đăng nhập ngay
        </Link>
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            {...register("fullname")}
            placeholder="Họ và tên của bạn"
            autoComplete="name"
            className="rounded-xl h-11"
          />
          {errors.fullname && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.fullname.message}
            </p>
          )}
        </div>

        <div>
          <Input
            {...register("username")}
            placeholder="Tên tài khoản"
            autoComplete="username"
            className="rounded-xl h-11"
          />
          {errors.username && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.username.message}
            </p>
          )}
        </div>

        <div>
          <Input
            {...register("email")}
            type="email"
            placeholder="Địa chỉ Email"
            autoComplete="email"
            className="rounded-xl h-11"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="relative">
          <Input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu"
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

        <Button
          type="submit"
          className="w-full h-11 rounded-xl"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner size="sm" /> : "Đăng ký tài khoản"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-[#555] leading-relaxed">
        Bằng việc đăng ký, bạn đồng ý với các{" "}
        <span className="text-[#777] hover:underline cursor-pointer">
          Điều khoản
        </span>{" "}
        và{" "}
        <span className="text-[#777] hover:underline cursor-pointer">
          Chính sách bảo mật
        </span>{" "}
        của chúng tôi.
      </p>
    </div>
  );
}