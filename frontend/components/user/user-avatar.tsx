"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/constants";

interface UserAvatarProps {
  src?: string | null;
  fallback: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const textSizes = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

export function UserAvatar({
  src,
  fallback,
  size = "md",
  className,
}: UserAvatarProps) {
  const getUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url}`;
  };

  const finalSrc = getUrl(src);

  return (
    /* 🌟 SỬA TẠI ĐÂY: Thêm thuộc tính key để ép Radix UI re-render từ đầu khi ảnh bị xóa */
    <Avatar
      key={finalSrc || "no-avatar"}
      className={cn(sizes[size], className)}
    >
      <AvatarImage src={finalSrc} alt={fallback} />
      <AvatarFallback
        className={cn(
          "font-semibold bg-[#2a2a2a] text-[#f3f3f3]",
          textSizes[size],
        )}
      >
        {fallback.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
