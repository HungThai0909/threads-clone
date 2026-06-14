"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "@/validators/auth.validator";

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({
  open,
  onClose,
}: ChangePasswordDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const logoutStore = useAuthStore(
    (state: any) =>
      state.logout ||
      (() => {
        if (state.setToken) state.setToken(null);
        if (state.setUser) state.setUser(null);
      }),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setLoading(true);
    try {
      await authService.changePassword(data.currentPassword, data.newPassword);

      toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");

      try {
        await authService.logout().catch(() => null);
      } catch (e) {}

      logoutStore();
      reset();
      onClose();

      router.push("/login");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Đổi mật khẩu thất bại. Vui lòng kiểm tra lại.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-106.25 bg-[#101010] text-[#f3f3f3] border-[#2a2a2a]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <KeyRound size={20} className="text-white" /> Đổi mật khẩu
          </DialogTitle>
          <DialogDescription className="text-[#777] text-sm pt-1">
            Nhập mật khẩu cũ và mật khẩu mới để tăng cường bảo mật cho tài khoản
            của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                className="bg-[#1a1a1a] border-[#2a2a2a] pr-10 focus-visible:ring-1 text-[#f3f3f3]"
                disabled={loading}
                {...register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#f3f3f3]"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-red-500">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                className="bg-[#1a1a1a] border-[#2a2a2a] pr-10 focus-visible:ring-1 text-[#f3f3f3]"
                disabled={loading}
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#f3f3f3]"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                className="bg-[#1a1a1a] border-[#2a2a2a] pr-10 focus-visible:ring-1 text-[#f3f3f3]"
                disabled={loading}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#777] hover:text-[#f3f3f3]"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="border-[#2a2a2a] bg-transparent text-white hover:bg-[#1e1e1e]"
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading} className="min-w-28">
              {loading ? <Spinner size="sm" /> : "Cập nhật"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
