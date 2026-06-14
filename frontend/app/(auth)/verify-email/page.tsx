"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { MailX, MailCheck, Send } from "lucide-react";
import { authService } from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  const [resendEmail, setResendEmail] = useState<string>("");
  const [isResending, setIsResending] = useState<boolean>(false);

  const effectRan = useRef(false);

  useEffect(() => {
    if (!token) {
      toast.error("Mã xác thực không tìm thấy trên liên kết.");
      setStatus("error");
      return;
    }

    if (effectRan.current) return;

    const verifyAccount = async () => {
      effectRan.current = true;
      try {
        const res = await authService.verifyEmail(token);

        if (res && res.success === true) {
          toast.success("Xác thực tài khoản thành công!");
          setStatus("success");

          const timeout = setTimeout(() => {
            router.push("/login");
          }, 3000);
          return () => clearTimeout(timeout);
        } else {
          setStatus("error");
        }
      } catch (err: any) {
        setStatus("error");
        const msg =
          err?.response?.data?.message ||
          "Kích hoạt tài khoản thất bại hoặc liên kết đã hết hạn.";
        toast.error(msg);
      }
    };

    verifyAccount();
  }, [token, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resendEmail || resendEmail.trim() === "") {
      toast.error("Vui lòng điền địa chỉ hòm thư Email của bạn.");
      return;
    }

    setIsResending(true);
    try {
      const response = await authService.resendVerification(resendEmail.trim());
      if (response && response.success) {
        toast.success(
          "Mã xác thực mới đã gửi thành công! Hãy kiểm tra hòm thư Gmail.",
        );
        setResendEmail("");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Không thể yêu cầu gửi lại mã xác thực vào lúc này.";
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh] animate-fade-in">
      <div className="w-full max-w-105 p-6 text-center">
        {status === "loading" && (
          <div className="flex flex-col gap-4 items-center">
            <Spinner size="lg" className="text-[#f3f3f3]" />
            <p className="text-sm text-[#777] leading-relaxed">
              Hệ thống đang tiến hành kích hoạt tài khoản của bạn, vui lòng đợi
              trong giây lát...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col gap-5 items-center">
            <div className="w-16 h-16 rounded-full bg-[#1c3326] flex items-center justify-center text-green-500 border border-green-900/50">
              <MailCheck size={32} />
            </div>
            <h2 className="text-xl font-bold text-[#f3f3f3]">
              Kích hoạt tài khoản thành công!
            </h2>
            <p className="text-sm text-[#777] leading-relaxed">
              Hệ thống đang tự động chuyển hướng bạn quay trở lại trang Đăng
              nhập sau 3 giây...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-5 items-center">
            <div className="w-16 h-16 rounded-full bg-[#441917] flex items-center justify-center text-red-500 border border-red-900/50">
              <MailX size={32} />
            </div>
            <h2 className="text-xl font-bold text-[#f3f3f3]">
              Kích hoạt thất bại
            </h2>
            <p className="text-sm text-[#777] leading-relaxed">
              Liên kết xác thực không tồn tại, sai ký tự hoặc đã hết giá trị
              hiệu lực 24 giờ.
            </p>

            <div className="w-full border-t border-[#2a2a2a] my-2"></div>

            <form
              onSubmit={handleResend}
              className="w-full flex flex-col gap-4 text-left"
            >
              <label className="text-xs font-medium text-[#777]">
                Nhận lại liên kết kích hoạt mới:
              </label>

              <Input
                type="email"
                placeholder="Nhập địa chỉ Email của bạn..."
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                disabled={isResending}
                required
                className="rounded-xl h-11"
              />

              <Button
                type="submit"
                disabled={isResending}
                className="w-full h-11 rounded-xl font-medium"
              >
                {isResending ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <Send size={16} className="mr-2" /> Gửi lại mã kích hoạt
                  </>
                )}
              </Button>
            </form>

            <Link href="/login" className="w-full mt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl"
              >
                Quay lại trang Đăng nhập
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

const VerifyEmailPageDynamic = dynamic(
  async () => {
    return function WrappedComponent() {
      return (
        <Suspense
          fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
              <Spinner size="lg" className="text-[#f3f3f3]" />
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      );
    };
  },
  { ssr: false },
);

export default VerifyEmailPageDynamic;
