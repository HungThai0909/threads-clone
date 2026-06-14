"use client";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { QUERY_KEYS, API_BASE_URL } from "@/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
  profile: any;
}

export function EditProfileDialog({
  open,
  onClose,
  profile,
}: EditProfileDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullname, setFullname] = useState("");
  const [bio, setBio] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeletedAvatar, setIsDeletedAvatar] = useState(false);
  const [loading, setLoading] = useState(false);

  const getFullAvatarUrl = (url?: string | null) => {
    if (!url) return null;
    return url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  };

  useEffect(() => {
    if (open && profile) {
      setFullname(profile.fullname || "");
      setBio(profile.bio || "");
      setPreviewUrl(getFullAvatarUrl(profile.avatarUrl));
      setSelectedFile(null);
      setIsDeletedAvatar(false);
    }
  }, [open, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setIsDeletedAvatar(false);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsDeletedAvatar(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let finalAvatarUrl = profile.avatarUrl;

      if (selectedFile) {
        const avatarRes = await userService.uploadAvatar(selectedFile);
        if (!avatarRes?.data?.avatarUrl) {
          throw new Error("Không thể tải ảnh đại diện lên hệ thống");
        }
        finalAvatarUrl = avatarRes.data.avatarUrl;
      } else if (isDeletedAvatar) {
        finalAvatarUrl = null;
      }

      const updatedPayload = {
        fullname,
        bio,
        avatarUrl: finalAvatarUrl,
      };

      await userService.updateProfile(updatedPayload as any);

      queryClient.setQueryData(
        QUERY_KEYS.USER_PROFILE(profile.id),
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              fullname: updatedPayload.fullname,
              bio: updatedPayload.bio,
              avatarUrl: updatedPayload.avatarUrl,
            },
          };
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.USER_PROFILE(profile.id),
        }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.USER_POSTS(profile.id),
        }),
      ]);

      toast.success("Cập nhật thông tin hồ sơ thành công!");
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Đã xảy ra lỗi khi lưu thông tin",
      );
    } finally {
      setLoading(false);
    }
  };

  const fallbackLetter = profile?.username?.charAt(0).toUpperCase() || "?";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-106.25 bg-[#101010] border-[#222] text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-center">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#222] bg-[#1a1a1a] cursor-pointer"
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold bg-[#252525] text-white selection:bg-transparent">
                    {fallbackLetter}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                  <Camera size={18} className="text-white" />
                </div>
              </div>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors shadow-md z-10 cursor-pointer"
                  title="Xóa ảnh đại diện"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <span className="text-xs text-[#555]">
              Nhấp vào vòng tròn để đổi ảnh hoặc nút đỏ để xóa
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#777]">Name</label>
            <input
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#444] transition-colors"
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#777]">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#444] transition-colors resize-none"
              placeholder="Write something about yourself..."
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto min-w-20"
          >
            {loading ? <Spinner size="sm" /> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
