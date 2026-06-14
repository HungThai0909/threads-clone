"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Heart, UserPlus, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/user/user-avatar";
import { notificationService } from "@/services/index";
import { QUERY_KEYS } from "@/constants";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

const typeConfig = {
  follow: {
    icon: UserPlus,
    color: "text-blue-400",
    label: "started following you",
  },
  like: { icon: Heart, color: "text-red-400", label: "liked your thread" },
  comment: {
    icon: MessageCircle,
    color: "text-green-400",
    label: "commented on your thread",
  },
  reply: {
    icon: MessageCircle,
    color: "text-purple-400",
    label: "replied to your comment",
  },
};

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: () => notificationService.getAll(),
  });

  const notifications = data?.data?.notifications ?? [];
  const unreadCount = data?.data?.unreadCount ?? 0;

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await notificationService.markRead(n.id);
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.NOTIFICATIONS,
      });
    }
    if (n.type === "follow") {
      router.push(`/profile/${n.sender.id}`);
    } else if (n.post?.id) {
      router.push(`/post/${n.post.id}`);
    }
  };

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Activity</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-2xl">🔔</p>
          <p className="text-foreground font-medium">No activity yet</p>
          <p className="text-muted-foreground text-sm">
            When someone interacts with you, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <div>
          {notifications.map((n: Notification) => {
            const config = typeConfig[n.type];
            const Icon = config.icon;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-4 border-b border-border hover:bg-muted/40 transition-colors text-left",
                  !n.isRead && "bg-muted/20",
                )}
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    src={n.sender.avatarUrl}
                    fallback={n.sender.fullname}
                    size="sm"
                  />

                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-background flex items-center justify-center border border-border",
                      config.color,
                    )}
                  >
                    <Icon size={10} fill="currentColor" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-tight">
                    <span className="font-semibold">{n.sender.username}</span>{" "}
                    <span className="text-muted-foreground">
                      {config.label}
                    </span>
                  </p>
                  {n.post?.content && (
                    <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-1">
                      {n.post.content}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>

                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
