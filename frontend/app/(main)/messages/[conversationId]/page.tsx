"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useQuery,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Send, X, Reply } from "lucide-react";
import { isToday, isYesterday, format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { UserAvatar } from "@/components/user/user-avatar";
import { Spinner } from "@/components/ui/spinner";
import { messageService } from "@/services/index";
import { userService } from "@/services/user.service";
import { useAuthStore } from "@/stores/auth.store";
import { useSocket } from "@/hooks/use-socket";
import { QUERY_KEYS, API_BASE_URL } from "@/constants";
import { cn } from "@/lib/utils";
import type { Message, Conversation } from "@/types";

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return `Hôm nay lúc ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `Hôm qua lúc ${format(date, "HH:mm")}`;
  return format(date, "dd/MM/yyyy 'lúc' HH:mm");
}

function getInitial(
  username?: string | null,
  fullname?: string | null,
): string {
  if (username) return username.charAt(0).toUpperCase();
  if (fullname) return fullname.charAt(0).toUpperCase();
  return "?";
}

function TypingBubble({
  avatarUrl,
  username,
  fullname,
}: {
  avatarUrl?: string | null;
  username?: string | null;
  fullname?: string | null;
}) {
  return (
    <div className="flex items-end gap-2 mt-3 animate-fade-in">
      <div className="w-7 shrink-0">
        <UserAvatar
          src={avatarUrl}
          fallback={getInitial(username, fullname)}
          size="xs"
        />
      </div>
      <div className="bg-muted border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const {
    socket,
    socketConnected,
    joinConversation,
    leaveConversation,
    emitTypingStart,
    emitTypingStop,
    onTyping,
    onTypingStop,
  } = useSocket();

  const isVirtual = conversationId.startsWith("new-user-");
  const virtualTargetUserId = isVirtual
    ? parseInt(conversationId.replace("new-user-", ""), 10)
    : null;
  const convId = isVirtual ? null : parseInt(conversationId, 10);

  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingAutoResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopTypingNow = useCallback(
    (cId: number) => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitTypingStop(cId);
      }
    },
    [emitTypingStop],
  );
  useEffect(() => {
    if (convId && socketConnected) {
      joinConversation(convId);
      return () => {
        leaveConversation(convId);
        stopTypingNow(convId);
      };
    }
  }, [
    convId,
    socketConnected,
    joinConversation,
    leaveConversation,
    stopTypingNow,
  ]);
  useEffect(() => {
    if (!convId || !socketConnected || !user?.id) return;

    const offStart = onTyping(convId, (data) => {
      if (data.userId !== user.id) {
        setIsOtherTyping(true);
        if (typingAutoResetRef.current)
          clearTimeout(typingAutoResetRef.current);
        typingAutoResetRef.current = setTimeout(
          () => setIsOtherTyping(false),
          5000,
        );
      }
    });

    const offStop = onTypingStop(convId, (data) => {
      if (data.userId !== user.id) {
        if (typingAutoResetRef.current)
          clearTimeout(typingAutoResetRef.current);
        setIsOtherTyping(false);
      }
    });

    return () => {
      offStart();
      offStop();
      if (typingAutoResetRef.current) clearTimeout(typingAutoResetRef.current);
    };
  }, [convId, socketConnected, user?.id, onTyping, onTypingStop]);

  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.MESSAGES(convId!),
    queryFn: ({ pageParam }) =>
      messageService.getMessages(convId!, pageParam as number | undefined),
    getNextPageParam: (last) => {
      const msgs = (last.data as Message[]) ?? [];
      return msgs.length === 30 ? msgs[msgs.length - 1]?.id : undefined;
    },
    initialPageParam: undefined as number | undefined,
    enabled: !isVirtual && !!convId,
  });

  const { data: virtualUserResponse } = useQuery({
    queryKey: ["VIRTUAL_CHAT_USER_HEADER", virtualTargetUserId],
    queryFn: () => userService.getProfile(virtualTargetUserId!),
    enabled: isVirtual && !!virtualTargetUserId,
  });

  const { data: convsData } = useQuery({
    queryKey: QUERY_KEYS.CONVERSATIONS,
    queryFn: () => messageService.getConversations(),
  });

  const conversations = (convsData?.data as Conversation[]) ?? [];
  const currentConv = conversations.find((c) => c.id === convId);
  const otherMember = isVirtual
    ? { user: virtualUserResponse?.data }
    : currentConv?.members.find((m) => m.user.id !== user?.id);

  const allMessages = isVirtual
    ? []
    : (
        messagesData?.pages.flatMap((p) => (p.data as Message[]) ?? []) ?? []
      ).reverse();

  const isFirstLoadRef = useRef(true);
  useEffect(() => {
    if (allMessages.length > 0 || isOtherTyping) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isFirstLoadRef.current ? "auto" : "smooth",
      });
      isFirstLoadRef.current = false;
    }
  }, [allMessages.length, isOtherTyping]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);

    if (!convId) return;

    if (!value || value.trim() === "") {
      stopTypingNow(convId);
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTypingStart(convId);
    }

    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitTypingStop(convId);
      }
    }, 1500);
  };

  const handleSend = async () => {
    if (!text.trim() && !imageFile) return;
    setSending(true);

    if (convId) stopTypingNow(convId);

    try {
      let activeConvId = convId;

      if (isVirtual && virtualTargetUserId) {
        const newConvRes = await messageService.getOrCreateConversation({
          participantIds: [virtualTargetUserId],
        });
        if (newConvRes?.data?.id) {
          activeConvId = newConvRes.data.id;
        } else {
          throw new Error("Không thể khởi tạo cuộc hội thoại.");
        }
      }

      if (!activeConvId) throw new Error("Không thể khởi tạo cuộc hội thoại.");

      const form = new FormData();
      form.append("conversationId", String(activeConvId));
      if (text.trim()) form.append("content", text.trim());
      if (imageFile) form.append("image", imageFile);
      if (replyTo) form.append("replyToMessageId", String(replyTo.id));

      await messageService.sendMessage(form);
      setText("");
      setImageFile(null);
      setImagePreview(null);
      setReplyTo(null);

      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.MESSAGES(activeConvId),
      });

      if (isVirtual) {
        router.replace(`/messages/${activeConvId}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const getImageUrl = (url: string) =>
    url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

  const getConvName = () => {
    if (isVirtual) return otherMember?.user?.fullname ?? "Loading...";
    if (!currentConv) return "Loading...";
    if (currentConv.isGroup) return currentConv.name ?? "Group";
    return otherMember?.user?.fullname ?? "Unknown";
  };

  const lastSeenMessageId = (() => {
    if (!user) return null;
    const myMessages = allMessages.filter((m) => m.sender.id === user.id);
    for (let i = myMessages.length - 1; i >= 0; i--) {
      const msg = myMessages[i];
      const seenByOther = msg.reads?.some((r) => r.userId !== user.id);
      if (seenByOther) return msg.id;
    }
    return null;
  })();

  const lastMyMessageId = (() => {
    if (!user) return null;
    const myMessages = allMessages.filter((m) => m.sender.id === user.id);
    return myMessages.length > 0 ? myMessages[myMessages.length - 1]?.id : null;
  })();

  return (
    <div className="flex flex-col h-full max-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        <button
          onClick={() => router.push("/messages")}
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        {otherMember?.user && (
          <UserAvatar
            src={otherMember.user.avatarUrl}
            fallback={getInitial(
              otherMember.user.username,
              otherMember.user.fullname,
            )}
            size="sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {getConvName()}
          </p>
          {isOtherTyping ? (
            <p className="text-xs text-primary animate-pulse font-medium">
              đang nhập...
            </p>
          ) : (
            otherMember?.user &&
            !currentConv?.isGroup && (
              <p className="text-xs text-muted-foreground/70">
                @{otherMember.user.username}
              </p>
            )
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {hasNextPage && !isVirtual && (
          <div className="flex justify-center mb-4">
            <button
              onClick={() => fetchNextPage()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted px-3 py-1.5 rounded-full"
            >
              Load older messages
            </button>
          </div>
        )}

        {isLoading && !isVirtual ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : allMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16 space-y-2">
            {otherMember?.user && (
              <UserAvatar
                src={otherMember.user.avatarUrl ?? null}
                fallback={getInitial(
                  otherMember.user.username,
                  otherMember.user.fullname,
                )}
                size="xl"
              />
            )}
            <p className="font-semibold text-foreground">{getConvName()}</p>
            <p className="text-xs text-muted-foreground/70">
              Start the conversation
            </p>
          </div>
        ) : (
          allMessages.map((msg: Message, idx) => {
            const isOwn = msg.sender.id === user?.id;
            const prevMsg = allMessages[idx - 1];
            const showAvatar =
              !isOwn && (idx === 0 || prevMsg?.sender.id !== msg.sender.id);
            const showTimestamp =
              idx === 0 ||
              new Date(msg.createdAt).getTime() -
                new Date(allMessages[idx - 1].createdAt).getTime() >
                300000;

            const isLastMyMsg = isOwn && msg.id === lastMyMessageId;
            const isSeenMsg = isOwn && msg.id === lastSeenMessageId;
            const showSent =
              isLastMyMsg && !isSeenMsg && lastSeenMessageId === null;
            const showSeen = isSeenMsg;

            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-muted-foreground/70 bg-muted px-3 py-1 rounded-full">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-end gap-2 group",
                    isOwn ? "justify-end" : "justify-start",
                    idx > 0 && allMessages[idx - 1].sender.id === msg.sender.id
                      ? "mt-0.5"
                      : "mt-3",
                  )}
                >
                  {!isOwn && (
                    <div className="w-7 shrink-0">
                      {showAvatar && (
                        <UserAvatar
                          src={msg.sender.avatarUrl}
                          fallback={getInitial(
                            msg.sender.username,
                            msg.sender.fullname,
                          )}
                          size="xs"
                        />
                      )}
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[70%] space-y-1",
                      isOwn && "items-end flex flex-col",
                    )}
                  >
                    {msg.replyTo && (
                      <div
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-xl border border-border bg-muted/50 text-muted-foreground mb-1 max-w-full",
                          isOwn ? "self-end" : "self-start",
                        )}
                      >
                        <span className="font-semibold text-foreground/80">
                          @{msg.replyTo.sender.username}
                        </span>{" "}
                        <span className="line-clamp-1 break-all">
                          {msg.replyTo.content || "[Hình ảnh]"}
                        </span>
                      </div>
                    )}

                    <div className="flex items-end gap-1.5">
                      {isOwn && (
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/50 hover:text-foreground transition-all shrink-0"
                        >
                          <Reply size={14} />
                        </button>
                      )}

                      <div>
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed wrap-break-word shadow-sm",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md border border-border",
                          )}
                        >
                          {msg.imageUrl && (
                            <img
                              src={getImageUrl(msg.imageUrl)}
                              alt="Uploaded visual"
                              className="rounded-xl max-w-60 mb-1.5 object-cover max-h-60"
                            />
                          )}
                          {msg.content && (
                            <span className="whitespace-pre-wrap">
                              {msg.content}
                            </span>
                          )}
                        </div>

                        {isOwn && (showSeen || showSent) && (
                          <div className="flex justify-end mt-1">
                            {showSeen ? (
                              <div className="flex items-center gap-1">
                                <UserAvatar
                                  src={otherMember?.user?.avatarUrl}
                                  fallback={getInitial(
                                    otherMember?.user?.username,
                                    otherMember?.user?.fullname,
                                  )}
                                  size="xs"
                                  className="w-3.5 h-3.5"
                                />
                                <span className="text-[10px] text-muted-foreground/60">
                                  Đã xem
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60">
                                Đã gửi
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {!isOwn && (
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/50 hover:text-foreground transition-all shrink-0"
                        >
                          <Reply size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isOtherTyping && !isVirtual && (
          <TypingBubble
            avatarUrl={otherMember?.user?.avatarUrl}
            username={otherMember?.user?.username}
            fullname={otherMember?.user?.fullname}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-t border-border shrink-0 animate-slide-up">
          <Reply size={14} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground/80">
              @{replyTo.sender.username}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyTo.content ?? "Hình ảnh"}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {imagePreview && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border-t border-border shrink-0">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Chosen File Preview"
              className="h-14 w-14 object-cover rounded-xl border border-border"
            />
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-destructive text-destructive-foreground shadow"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background shrink-0">
        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors shrink-0"
        >
          <ImagePlus size={20} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        <input
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message..."
          className="flex-1 h-10 px-4 rounded-full bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-muted-foreground/80 transition-colors"
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !imageFile) || sending}
          className={cn(
            "p-2 rounded-xl transition-colors shrink-0",
            text.trim() || imageFile
              ? "text-foreground bg-muted hover:bg-muted/80 border border-border"
              : "text-muted-foreground/40 cursor-not-allowed",
          )}
        >
          {sending ? <Spinner size="sm" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
