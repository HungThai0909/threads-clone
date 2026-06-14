"use client";
import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_URL } from "@/constants";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants";
import { toast } from "sonner";
import type { Message } from "@/types";

let globalSocket: Socket | null = null;

export function useSocket() {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [socketConnected, setSocketConnected] = useState(false);

  const {
    setUnreadMessages,
    setUnreadNotifications,
    unreadNotifications,
    unreadMessages,
  } = useUIStore();

  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const contextRef = useRef({
    setUnreadNotifications,
    setUnreadMessages,
    unreadNotifications,
    unreadMessages,
    queryClient,
  });

  useEffect(() => {
    contextRef.current = {
      setUnreadNotifications,
      setUnreadMessages,
      unreadNotifications,
      unreadMessages,
      queryClient,
    };
  }, [
    setUnreadNotifications,
    setUnreadMessages,
    unreadNotifications,
    unreadMessages,
    queryClient,
  ]);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
      socketRef.current = null;
      setSocketConnected(false);
      return;
    }

    if (!globalSocket) {
      globalSocket = io(SOCKET_URL, {
        auth: { token: accessToken },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 5,
      });
    }

    socketRef.current = globalSocket;
    setSocketConnected(globalSocket.connected);

    const currentSocket = globalSocket;

    const handleConnect = () => {
      setSocketConnected(true);
      console.log("[Socket] Connected:", currentSocket.id);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      console.log("[Socket] Disconnected");
    };

    const handleNewNotification = (notification: any) => {
      const currentUnread = contextRef.current.unreadNotifications;
      contextRef.current.setUnreadNotifications(currentUnread + 1);
      void contextRef.current.queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.NOTIFICATIONS,
      });

      const typeLabels: Record<string, string> = {
        follow: "started following you",
        like: "liked your thread",
        comment: "commented on your thread",
        reply: "replied to your comment",
      };
      toast(
        `@${notification?.sender?.username} ${typeLabels[notification?.type] ?? "interacted with you"}`,
        { duration: 3000 },
      );
    };

    const handleBadgeUpdate = ({ unreadCount }: { unreadCount: number }) => {
      contextRef.current.setUnreadNotifications(unreadCount);
    };

    const handleNewMessage = (
      message: Message & { conversationId: number },
    ) => {
      void contextRef.current.queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS,
      });

      if (message?.conversationId) {
        const messagesKey = QUERY_KEYS.MESSAGES(Number(message.conversationId));
        const existing =
          contextRef.current.queryClient.getQueryData<any>(messagesKey);

        if (existing?.pages) {
          const alreadyExists = existing.pages.some((page: any) =>
            (page.data as Message[])?.some(
              (m) => Number(m.id) === Number(message.id),
            ),
          );

          if (!alreadyExists) {
            contextRef.current.queryClient.setQueryData(
              messagesKey,
              (old: any) => {
                if (!old?.pages) return old;
                return {
                  ...old,
                  pages: old.pages.map((page: any, idx: number) => {
                    if (idx !== 0) return page;
                    return {
                      ...page,
                      data: [message, ...(page.data ?? [])],
                    };
                  }),
                };
              },
            );
          }
        } else {
          void contextRef.current.queryClient.invalidateQueries({
            queryKey: messagesKey,
          });
        }
      }

      const currentMessages = contextRef.current.unreadMessages;
      contextRef.current.setUnreadMessages(currentMessages + 1);
    };

    const handleConversationUpdate = () => {
      void contextRef.current.queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS,
      });
    };

    currentSocket.on("connect", handleConnect);
    currentSocket.on("disconnect", handleDisconnect);
    currentSocket.on("notification:new", handleNewNotification);
    currentSocket.on("notification:badge_update", handleBadgeUpdate);
    currentSocket.on("message:new", handleNewMessage);
    currentSocket.on("conversation:update", handleConversationUpdate);

    if (currentSocket.connected) {
      handleConnect();
    }

    return () => {
      currentSocket.off("connect", handleConnect);
      currentSocket.off("disconnect", handleDisconnect);
      currentSocket.off("notification:new", handleNewNotification);
      currentSocket.off("notification:badge_update", handleBadgeUpdate);
      currentSocket.off("message:new", handleNewMessage);
      currentSocket.off("conversation:update", handleConversationUpdate);
    };
  }, [isAuthenticated, accessToken]);

  const joinConversation = useCallback((conversationId: number) => {
    socketRef.current?.emit("conversation:join", {
      conversationId: Number(conversationId),
    });
  }, []);

  const leaveConversation = useCallback((conversationId: number) => {
    socketRef.current?.emit("conversation:leave", {
      conversationId: Number(conversationId),
    });
  }, []);

  const emitTypingStart = useCallback((conversationId: number) => {
    socketRef.current?.emit("typing:start", {
      conversationId: Number(conversationId),
    });
  }, []);

  const emitTypingStop = useCallback((conversationId: number) => {
    socketRef.current?.emit("typing:stop", {
      conversationId: Number(conversationId),
    });
  }, []);

  const onTyping = useCallback(
    (
      conversationId: number,
      callback: (data: { userId: number; conversationId: number }) => void,
    ): (() => void) => {
      const handler = (data: { userId: number; conversationId: number }) => {
        if (Number(data.conversationId) === Number(conversationId)) {
          callback(data);
        }
      };

      const socket = socketRef.current;
      if (socket) {
        socket.on("typing:start", handler);
      }

      return () => {
        socket?.off("typing:start", handler);
      };
    },
    [],
  );

  const onTypingStop = useCallback(
    (
      conversationId: number,
      callback: (data: { userId: number; conversationId: number }) => void,
    ): (() => void) => {
      const handler = (data: { userId: number; conversationId: number }) => {
        if (Number(data.conversationId) === Number(conversationId)) {
          callback(data);
        }
      };

      const socket = socketRef.current;
      if (socket) {
        socket.on("typing:stop", handler);
      }

      return () => {
        socket?.off("typing:stop", handler);
      };
    },
    [],
  );

  return {
    socket: socketConnected ? socketRef.current : null,
    socketConnected,
    joinConversation,
    leaveConversation,
    emitTypingStart,
    emitTypingStop,
    onTyping,
    onTypingStop,
  };
}
