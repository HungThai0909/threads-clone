"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import { loginSchema, LoginFormData } from "@/validators/auth.validator";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
        };
      };
    };
  }
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: TokenResponse) => void;
  error_callback?: (error: TokenErrorResponse) => void;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface TokenResponse {
  access_token: string;
  error?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

interface TokenErrorResponse {
  type: string;
  message?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const tokenClientRef = useRef<TokenClient | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleTokenResponse = useCallback(
    async (tokenResponse: TokenResponse) => {
      if (tokenResponse.error) {
        if (tokenResponse.error !== "access_denied") {
          toast.error(`Google báo lỗi: ${tokenResponse.error}`);
        }
        setGoogleLoading(false);
        return;
      }

      try {
        const userInfoRes = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.access_token}`,
            },
          },
        );

        if (!userInfoRes.ok) {
          throw new Error(
            "Không thể lấy thông tin từ Google. Vui lòng thử lại.",
          );
        }

        const userInfo: GoogleUserInfo = await userInfoRes.json();

        if (!userInfo.email_verified) {
          toast.error("Email Google của bạn chưa được xác minh.");
          setGoogleLoading(false);
          return;
        }

        const res = await authService.loginWithGoogle({
          providerUserId: userInfo.sub,
          email: userInfo.email,
          fullname: userInfo.name,
          avatarUrl: userInfo.picture,
        });

        if (res.success && res.data) {
          setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
          toast.success(`Chào mừng ${res.data.user.fullname}! 🎉`);
          router.push("/feed");
        } else {
          toast.error(res.message ?? "Đăng nhập Google thất bại.");
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Đăng nhập bằng Google thất bại.";
        toast.error(msg);
      } finally {
        setGoogleLoading(false);
      }
    },
    [router, setAuth],
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    if (window.google?.accounts?.oauth2) {
      initTokenClient();
      return;
    }

    const existing = document.getElementById("google-gsi-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initTokenClient();
    script.onerror = () => console.error("[GSI] Không tải được Google script.");
    document.head.appendChild(script);
  }, [handleTokenResponse]);

  function initTokenClient() {
    if (!window.google?.accounts?.oauth2) return;

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,

      scope: "openid email profile",
      callback: handleTokenResponse,
      error_callback: (err: TokenErrorResponse) => {
        if (err.type !== "popup_closed_by_user") {
          toast.error("Đăng nhập Google bị gián đoạn. Vui lòng thử lại.");
        }
        setGoogleLoading(false);
      },
    });

    setGsiReady(true);
  }

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error(
        "Chưa cấu hình Google Client ID. Thêm NEXT_PUBLIC_GOOGLE_CLIENT_ID vào .env.local",
      );
      return;
    }

    if (!gsiReady || !tokenClientRef.current) {
      toast.error("Google đang khởi tạo. Vui lòng thử lại sau giây lát.");
      return;
    }

    setGoogleLoading(true);

    tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await authService.login(data.email, data.password);
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
        toast.success("Đăng nhập thành công! Chào mừng bạn quay trở lại.");
        router.push("/feed");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Đăng nhập thất bại. Vui lòng thử lại.";
      toast.error(msg);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-center text-[#f3f3f3] mb-1">
        Đăng nhập vào Threads
      </h1>
      <p className="text-center text-[#777] text-sm mb-8">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="text-[#f3f3f3] hover:underline font-medium"
        >
          Đăng ký ngay
        </Link>
      </p>

      <Button
        type="button"
        onClick={handleGoogleClick}
        disabled={isSubmitting || googleLoading}
        className="w-full h-11 mb-4 flex items-center justify-center gap-2.5 bg-[#f3f3f3] text-[#101010] hover:bg-white border-none transition-all rounded-xl shadow-sm disabled:opacity-70"
      >
        {googleLoading ? (
          <>
            <Spinner size="sm" />
            <span className="text-sm font-semibold text-[#101010]">
              Đang kết nối...
            </span>
          </>
        ) : (
          <>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              className="shrink-0"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-semibold text-[#101010]">
              Tiếp tục với Google
            </span>
          </>
        )}
      </Button>

      <div className="flex items-center my-5">
        <div className="flex-1 border-t border-[#2a2a2a]" />
        <span className="px-3 text-xs text-[#555] uppercase tracking-wider">
          Hoặc
        </span>
        <div className="flex-1 border-t border-[#2a2a2a]" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            autoComplete="current-password"
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

        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-xs text-[#777] hover:text-[#f3f3f3] transition-colors"
          >
            Quên mật khẩu?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full h-11 rounded-xl"
          disabled={isSubmitting || googleLoading}
        >
          {isSubmitting ? <Spinner size="sm" /> : "Đăng nhập"}
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
        <p className="text-center text-xs text-[#555] leading-relaxed">
          Bằng việc tiếp tục, bạn đồng ý với{" "}
          <span className="text-[#777] cursor-pointer hover:underline">
            Điều khoản dịch vụ
          </span>{" "}
          và{" "}
          <span className="text-[#777] cursor-pointer hover:underline">
            Chính sách bảo mật
          </span>{" "}
          của chúng tôi.
        </p>
      </div>
    </div>
  );
}
