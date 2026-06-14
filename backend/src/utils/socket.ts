import { Server, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { jwtService } from "./jwt";
import { prisma } from "./prisma";

interface AuthSocket extends Socket {
  userId: number;
}

export const onlineUsers = new Map<number, Set<string>>();

export function initSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth.token as string) ||
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(" ")[1];

    if (!token)
      return next(new Error("Authentication error: No token provided"));

    const result = jwtService.verifyAccessToken(token);

    if ("valid" in result) {
      if (result.expired) {
        return next(new Error("Authentication error: Token expired"));
      }
      return next(new Error("Authentication error: Invalid token"));
    }

    (socket as AuthSocket).userId = result.userId;
    next();
  });

  io.on("connection", async (socket: Socket) => {
    const userId = (socket as AuthSocket).userId;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId)!.add(socket.id);

    try {
      await prisma.userPresence.upsert({
        where: { userId },
        update: { isOnline: true, updatedAt: new Date() },
        create: { userId, isOnline: true, updatedAt: new Date() },
      });

      await socket.join(`user:${userId}`);
      io.emit("user:online", { userId });
    } catch (err) {
      console.error(
        `Failed to update online presence for user ${userId}:`,
        err,
      );
    }

    socket.on("conversation:join", (data: any) => {
      const conversationId =
        typeof data === "object" ? data?.conversationId : data;
      if (conversationId) {
        void socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on("conversation:leave", (data: any) => {
      const conversationId =
        typeof data === "object" ? data?.conversationId : data;
      if (conversationId) {
        void socket.leave(`conversation:${conversationId}`);
      }
    });

    socket.on("typing:start", (data: any) => {
      const conversationId =
        typeof data === "object" ? data?.conversationId : data;
      if (conversationId) {
        socket
          .to(`conversation:${conversationId}`)
          .emit("typing:start", { userId, conversationId });
      }
    });

    socket.on("typing:stop", (data: any) => {
      const conversationId =
        typeof data === "object" ? data?.conversationId : data;
      if (conversationId) {
        socket
          .to(`conversation:${conversationId}`)
          .emit("typing:stop", { userId, conversationId });
      }
    });

    socket.on("disconnect", async () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          const disconnectTime = new Date();
          try {
            await prisma.userPresence.upsert({
              where: { userId },
              update: {
                isOnline: false,
                lastSeenAt: disconnectTime,
                updatedAt: disconnectTime,
              },
              create: {
                userId,
                isOnline: false,
                lastSeenAt: disconnectTime,
                updatedAt: disconnectTime,
              },
            });
            io.emit("user:offline", { userId, lastSeenAt: disconnectTime });
          } catch (err) {
            console.error(
              `Failed to update offline presence for user ${userId}:`,
              err,
            );
          }
        }
      }
    });
  });

  return io;
}

export function emitToUser(
  io: Server,
  userId: string | number,
  event: string,
  data: unknown,
) {
  if (onlineUsers.has(Number(userId))) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToConversation(
  io: Server,
  conversationId: string | number,
  event: string,
  data: unknown,
) {
  io.to(`conversation:${conversationId}`).emit(event, data);
}
