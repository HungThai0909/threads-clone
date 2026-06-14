"use client";
import { useState, useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user/user-avatar";
import { useAuthStore } from "@/stores/auth.store";
import { postService } from "@/services/post.service";
import { QUERY_KEYS } from "@/constants";
import { cn } from "@/lib/utils";
import type { Post } from "@/types";

interface CreatePostDialogProps {
  open: boolean;
  onClose: () => void;
  replyToPostId?: number;
  quotingPost?: {
    id: number;
    author: { username: string };
    content: string | null;
  };
}

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Tất cả mọi người" },
  { value: "followers", label: "Người theo dõi" },
  { value: "private", label: "Chỉ mình tôi" },
] as const;

type Visibility = "public" | "followers" | "private";

export function CreatePostDialog({
  open,
  onClose,
  replyToPostId,
  quotingPost,
}: CreatePostDialogProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 4) {
      toast.error("Tối đa 4 ảnh mỗi bài viết");
      return;
    }
    setImages((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) =>
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setContent("");
    setImages([]);
    setPreviews([]);
    setVisibility("public");
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      toast.error("Vui lòng nhập nội dung hoặc thêm ảnh");
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const form = new FormData();
      if (content.trim()) form.append("content", content.trim());
      form.append("visibility", visibility);
      images.forEach((img) => form.append("images", img));

      if (replyToPostId) {
        await postService.replyPost(replyToPostId, form);
        toast.success("Đã đăng phản hồi thành công!");

        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.COMMENTS(replyToPostId),
        });
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.POST(replyToPostId),
        });
      } else if (quotingPost) {
        const res = await postService.quotePost(quotingPost.id, form);
        toast.success("Đã đăng bài trích dẫn thành công!");

        _prependToFeed(queryClient, res.data, user);
      } else {
        const res = await postService.createPost(form);
        toast.success("Đã đăng bài viết thành công!");

        _prependToFeed(queryClient, res.data, user);
      }

      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Đăng bài thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  const canPost = (content.trim().length > 0 || images.length > 0) && !loading;
  const title = replyToPostId
    ? "Viết phản hồi"
    : quotingPost
      ? "Trích dẫn bài viết"
      : "Bài viết mới";

  const userFallback =
    user?.username?.charAt(0).toUpperCase() ??
    user?.fullname?.charAt(0).toUpperCase() ??
    "U";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#2a2a2a]">
          <DialogTitle className="text-center text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="p-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <UserAvatar
                src={user?.avatarUrl}
                fallback={userFallback}
                size="md"
              />
              {(content.trim() || images.length > 0) && (
                <div className="w-0.5 bg-[#2a2a2a] flex-1 mt-2 min-h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[#f3f3f3] mb-1.5">
                {user?.username}
              </p>
              <textarea
                ref={textRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  replyToPostId
                    ? "Nhập nội dung phản hồi..."
                    : "Bạn đang nghĩ gì?"
                }
                rows={3}
                maxLength={500}
                className="w-full bg-transparent text-[#f3f3f3] text-sm placeholder:text-[#555] resize-none focus:outline-none leading-relaxed"
                autoFocus
              />

              {previews.length > 0 && (
                <div
                  className={cn(
                    "grid gap-2 mt-3",
                    previews.length > 1 ? "grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {previews.map((p, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={p}
                        alt=""
                        className="w-full object-cover rounded-xl max-h-48"
                      />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-black opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {quotingPost && (
                <div className="mt-3 border border-[#2a2a2a] rounded-xl p-3 bg-[#1a1a1a]">
                  <p className="text-xs font-semibold text-[#777] mb-1">
                    @{quotingPost.author.username}
                  </p>
                  <p className="text-xs text-[#aaa] line-clamp-2">
                    {quotingPost.content}
                  </p>
                </div>
              )}

              {images.length < 4 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 text-[#777] hover:text-[#f3f3f3] transition-colors"
                >
                  <ImagePlus size={18} />
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 pb-5 pt-3 border-t border-[#2a2a2a]">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="text-xs text-[#777] bg-transparent border border-[#2a2a2a] rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-[#181818]"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span
                className={cn(
                  "text-xs",
                  content.length > 480 ? "text-red-400" : "text-[#555]",
                )}
              >
                {500 - content.length}
              </span>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!canPost}
              size="sm"
              className="px-5 font-medium"
            >
              {loading ? <Spinner size="sm" /> : "Đăng"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function _prependToFeed(
  queryClient: ReturnType<typeof useQueryClient>,
  serverPost: Post | undefined | null,
  currentUser: {
    id: number;
    username: string;
    fullname: string;
    avatarUrl: string | null;
    isVerified: boolean;
  },
) {
  if (!serverPost) return;

  const postToInsert: Post = {
    ...serverPost,
    author: {
      id: currentUser.id,
      username: currentUser.username,
      fullname: currentUser.fullname,
      avatarUrl: currentUser.avatarUrl,
      isVerified: currentUser.isVerified,
    },
    isLiked: false,
    likesCount: 0,
  };

  queryClient.setQueryData(QUERY_KEYS.FEED, (old: any) => {
    if (!old?.pages) {
      return {
        pages: [{ success: true, data: [postToInsert] }],
        pageParams: [1],
      };
    }
    return {
      ...old,
      pages: old.pages.map((page: any, idx: number) =>
        idx === 0
          ? { ...page, data: [postToInsert, ...(page.data ?? [])] }
          : page,
      ),
    };
  });

  queryClient.setQueryData(
    QUERY_KEYS.USER_POSTS(currentUser.id),
    (old: any) => {
      if (!old?.pages) {
        return {
          pages: [{ success: true, data: [postToInsert] }],
          pageParams: [1],
        };
      }
      return {
        ...old,
        pages: old.pages.map((page: any, idx: number) =>
          idx === 0
            ? { ...page, data: [postToInsert, ...(page.data ?? [])] }
            : page,
        ),
      };
    },
  );
}
