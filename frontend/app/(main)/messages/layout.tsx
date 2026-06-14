"use client";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { MessageCircle, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import { NewConversationDialog } from "@/components/message/new-conversation-dialog";
import { messageService } from "@/services/index";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/stores/auth.store";
import { QUERY_KEYS, API_BASE_URL } from "@/constants";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

// Lấy chữ cái đầu viết hoa của username, fallback về fullname rồi "?"
function getAvatarFallback(conv: any, currentUserId?: number): string {
  const other = conv.members.find((m: any) => m.user.id !== currentUserId);
  if (conv.isGroup) {
    const name = conv.name ?? "G";
    return name.charAt(0).toUpperCase();
  }
  const username = other?.user?.username;
  if (username) return username.charAt(0).toUpperCase();
  const fullname = other?.user?.fullname;
  if (fullname) return fullname.charAt(0).toUpperCase();
  return "?";
}

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [displayConversations, setDisplayConversations] = useState<any[]>([]);

  const targetUserIdStr = searchParams.get("userId");
  const targetUserId = targetUserIdStr ? parseInt(targetUserIdStr, 10) : null;

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.CONVERSATIONS,
    queryFn: () => messageService.getConversations(),
    refetchInterval: 15000,
  });

  const dbConversations = (data?.data as Conversation[]) ?? [];

  const hasExistingConv = dbConversations.some(
    (c) => !c.isGroup && c.members.some((m) => m.user.id === targetUserId),
  );

  const { data: targetUserData } = useQuery({
    queryKey: ["CHAT_TARGET_USER", targetUserId],
    queryFn: () => userService.getProfile(targetUserId!),
    enabled: !!targetUserId && !hasExistingConv,
  });

  useEffect(() => {
    if (isLoading) return;

    const existingConv = dbConversations.find(
      (c) => !c.isGroup && c.members.some((m) => m.user.id === targetUserId),
    );

    if (existingConv) {
      router.replace(`/messages/${existingConv.id}`);
      setDisplayConversations(dbConversations);
    } else if (targetUserId && targetUserData?.data) {
      const targetUser = targetUserData.data;

      const virtualConv = {
        id: `new-user-${targetUser.id}`,
        isGroup: false,
        isVirtual: true,
        members: [
          {
            user: {
              id: user?.id,
              fullname: user?.fullname,
              username: user?.username,
              avatarUrl: user?.avatarUrl,
            },
          },
          {
            user: {
              id: targetUser.id,
              fullname: targetUser.fullname,
              username: targetUser.username,
              avatarUrl: targetUser.avatarUrl,
            },
          },
        ],
        messages: [],
      };

      setDisplayConversations([virtualConv, ...dbConversations]);
      router.replace(`/messages/new-user-${targetUser.id}`);
    } else {
      setDisplayConversations(dbConversations);
    }
  }, [targetUserId, dbConversations, targetUserData, isLoading, router, user]);

  const getConversationName = (conv: any) => {
    if (conv.isGroup) return conv.name ?? "Group";
    const other = conv.members.find((m: any) => m.user.id !== user?.id);
    return other?.user.fullname ?? "Unknown";
  };

  const getConversationAvatar = (conv: any) => {
    if (conv.isGroup) return null;
    const other = conv.members.find((m: any) => m.user.id !== user?.id);
    return other?.user.avatarUrl ?? null;
  };

  const getLastMessage = (conv: any) => {
    if (conv.isVirtual) return "✨ Bắt đầu cuộc trò chuyện mới...";
    const msg = conv.messages?.[0];
    if (!msg) return "No messages yet";
    if (msg.imageUrl && !msg.content) return "📷 Image";
    return msg.content ?? "";
  };

  return (
    <div className="flex h-screen pt-0 -mx-4 bg-background">
      {/* Sidebar chứa danh sách cuộc hội thoại */}
      <div
        className={cn(
          "w-full md:w-[320px] border-r border-border flex flex-col shrink-0 bg-background",
          pathname !== "/messages" && "hidden md:flex",
        )}
      >
        {/* Header Sidebar - text-foreground đổi chữ "Messages" thành màu đen ở chế độ sáng */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
          <button
            onClick={() => setNewConvOpen(true)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Vùng danh sách tin nhắn cuộn được */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : displayConversations.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-2">
              <MessageCircle size={36} className="text-muted-foreground/30 mx-auto" />
              <p className="text-foreground font-medium text-sm">
                No conversations yet
              </p>
              <p className="text-muted-foreground/70 text-xs">
                Start a conversation with someone
              </p>
            </div>
          ) : (
            displayConversations.map((conv: any) => {
              const isActive = pathname === `/messages/${conv.id}`;
              const otherUser = conv.members.find(
                (m: any) => m.user.id !== user?.id,
              );
              return (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/messages/${conv.id}`)}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-3.5 border-b border-border hover:bg-muted/40 transition-colors text-left cursor-pointer",
                    isActive && "bg-muted",
                  )}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={getConversationAvatar(conv)}
                      fallback={getAvatarFallback(conv, user?.id)}
                      size="md"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      {/* text-foreground đổi tên user thành màu đen ở chế độ sáng */}
                      <span className="text-sm font-semibold text-foreground truncate">
                        {getConversationName(conv)}
                      </span>
                      {conv.messages?.[0] && (
                        <span className="text-xs text-muted-foreground/60 shrink-0 ml-2">
                          {formatDistanceToNow(
                            new Date(conv.messages[0].createdAt),
                            { addSuffix: true, locale: vi },
                          )}
                        </span>
                      )}
                    </div>
                    {!conv.isGroup && otherUser && (
                      <p className="text-xs text-muted-foreground/60">
                        @{otherUser.user.username}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-xs truncate mt-0.5",
                        conv.isVirtual
                          ? "text-emerald-500 font-medium italic"
                          : "text-muted-foreground/80",
                      )}
                    >
                      {getLastMessage(conv)}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Vùng hiển thị chi tiết tin nhắn bên phải */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-background",
          pathname === "/messages" && "hidden md:flex",
        )}
      >
        {children}
      </div>

      <NewConversationDialog
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        onCreated={(convId) => {
          setNewConvOpen(false);
          router.push(`/messages/${convId}`);
        }}
      />
    </div>
  );
}