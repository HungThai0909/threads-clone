import { prisma } from "../utils/prisma";
import { AppError, ForbiddenError, NotFoundError } from "../utils/errors";
import { emitToConversation, emitToUser } from "../utils/socket";
import type { Server } from "socket.io";
import crypto from "crypto";

const msgSelect = {
  id: true,
  conversationId: true,
  content: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  sender: {
    select: { id: true, username: true, fullname: true, avatarUrl: true },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      sender: { select: { id: true, username: true } },
    },
  },
  reads: { select: { userId: true, readAt: true } },
};

export const messageService = {
  async getOrCreateConversation(
    creatorId: number,
    data: { participantIds: number[]; name?: string; isGroup?: boolean },
  ) {
    const allIds = [...new Set([creatorId, ...data.participantIds])];
    const isGroup = allIds.length > 2 ? true : (data.isGroup ?? false);
    const validName =
      data.name && data.name.trim() !== "" ? data.name.trim() : null;

    if (!isGroup && allIds.length === 2) {
      const firstId = allIds[0]!;
      const secondId = allIds[1]!;

      const blockExist = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: firstId, blockedId: secondId },
            { blockerId: secondId, blockedId: firstId },
          ],
        },
      });
      if (blockExist)
        throw new ForbiddenError(
          "Không thể tạo cuộc trò chuyện do giới hạn chặn.",
        );

      const sorted = [...allIds].sort((a, b) => a - b);
      const hash = crypto
        .createHash("md5")
        .update(sorted.join("_"))
        .digest("hex");

      const existing = await prisma.conversation.findUnique({
        where: { uniqueTwowayHash: hash },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullname: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
      if (existing) return existing;

      return prisma.conversation.create({
        data: {
          createdBy: creatorId,
          isGroup: false,
          uniqueTwowayHash: hash,
          name: null,
          members: {
            create: allIds.map((uid) => ({
              userId: uid,
              role: uid === creatorId ? "creator" : "member",
              joinedAt: new Date(),
            })),
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullname: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    }

    if (isGroup && !validName) {
      throw new AppError("Trò chuyện nhóm bắt buộc phải cấu hình tên phòng.");
    }

    return prisma.conversation.create({
      data: {
        createdBy: creatorId,
        name: validName,
        isGroup: true,
        members: {
          create: allIds.map((uid) => ({
            userId: uid,
            role: uid === creatorId ? "creator" : "member",
            joinedAt: new Date(),
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullname: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  },

  async getConversations(userId: number) {
    return prisma.conversation.findMany({
      where: { members: { some: { userId, hiddenAt: null } } },
      include: {
        members: {
          where: { userId: { not: userId } },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullname: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            imageUrl: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  async getMessagesAndMarkRead(
    userId: number,
    conversationId: number,
    cursor?: number,
    io?: Server,
  ) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member)
      throw new ForbiddenError("Bạn không phải thành viên phòng chat này.");

    if (cursor) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: cursor },
      });
      if (
        !cursorMessage ||
        cursorMessage.conversationId !== conversationId ||
        cursorMessage.createdAt < member.joinedAt
      ) {
        throw new ForbiddenError(
          "Yêu cầu định danh phân trang dữ liệu không hợp lệ.",
        );
      }
    }

    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { gte: member.joinedAt },
        senderId: { not: userId },
        reads: { none: { userId } },
      },
      select: { id: true },
    });

    if (unreadMessages.length > 0) {
      await prisma.$transaction([
        ...unreadMessages.map((msg) =>
          prisma.messageRead.upsert({
            where: { messageId_userId: { messageId: msg.id, userId } },
            update: { readAt: new Date() },
            create: { messageId: msg.id, userId, readAt: new Date() },
          }),
        ),
        prisma.conversationMember.update({
          where: { conversationId_userId: { conversationId, userId } },
          data: { lastReadAt: new Date() },
        }),
      ]);

      if (io) {
        emitToConversation(io, String(conversationId), "message:seen_all", {
          conversationId: Number(conversationId), 
          userId,
          readAt: new Date(),
        });
      }
    }

    return prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        createdAt: { gte: member.joinedAt },
      },
      select: msgSelect,
      orderBy: { createdAt: "desc" },
      take: 30,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
  },

  async sendMessage(
    senderId: number,
    conversationId: number,
    data: { content?: string; imageUrl?: string; replyToMessageId?: number },
    io?: Server,
  ) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: senderId } },
      include: { conversation: true },
    });
    if (!member)
      throw new ForbiddenError("Bạn không phải thành viên của cuộc hội thoại.");

    if (!member.conversation.isGroup) {
      const otherMember = await prisma.conversationMember.findFirst({
        where: { conversationId, userId: { not: senderId } },
      });
      if (otherMember) {
        const hasBlock = await prisma.userBlock.findFirst({
          where: {
            OR: [
              { blockerId: senderId, blockedId: otherMember.userId },
              { blockerId: otherMember.userId, blockedId: senderId },
            ],
          },
        });
        if (hasBlock)
          throw new ForbiddenError(
            "Không thể gửi tin nhắn do trạng thái khóa chặn.",
          );
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: data.content || null,
        imageUrl: data.imageUrl || null,
        replyToMessageId: data.replyToMessageId || null,
      },
      select: msgSelect,
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    if (io) {
      const realtimeMessagePayload = {
        ...message,
        conversationId: Number(conversationId),
      };
      emitToConversation(io, String(conversationId), "message:new", realtimeMessagePayload);
      const members = await prisma.conversationMember.findMany({
        where: { conversationId, userId: { not: senderId } },
        select: { userId: true },
      });

      members.forEach(({ userId }) => {
        emitToUser(io, String(userId), "conversation:update", {
          conversationId: Number(conversationId), 
          lastMessage: {
            id: message.id,
            content: message.content,
            imageUrl: message.imageUrl,
            createdAt: message.createdAt,
            senderId: message.sender.id,
          },
        });
      });
    }
    return message;
  },

  async markSingleMessageAsRead(
    userId: number,
    messageId: number,
    io?: Server,
  ) {
    const targetMessage = await prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!targetMessage) throw new NotFoundError("Tin nhắn không tồn tại.");

    const member = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: targetMessage.conversationId,
          userId,
        },
      },
    });
    if (!member)
      throw new ForbiddenError(
        "Bạn không nằm trong nhóm chat chứa tin nhắn này.",
      );

    await prisma.$transaction([
      prisma.messageRead.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { readAt: new Date() },
        create: { messageId, userId, readAt: new Date() },
      }),
      prisma.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId: targetMessage.conversationId,
            userId,
          },
        },
        data: { lastReadAt: new Date() },
      }),
    ]);

    if (io) {
      emitToConversation(
        io,
        String(targetMessage.conversationId),
        "message:seen",
        {
          messageId,
          conversationId: Number(targetMessage.conversationId), 
          userId,
          readAt: new Date(),
        },
      );
    }
    return true;
  },

  async getUnreadCount(userId: number): Promise<number> {
    const myConversations = await prisma.conversationMember.findMany({
      where: { userId, hiddenAt: null },
      select: { conversationId: true, joinedAt: true },
    });

    if (myConversations.length === 0) return 0;

    const unreadConditions = myConversations.map((con) => ({
      conversationId: con.conversationId,
      createdAt: { gte: con.joinedAt },
    }));

    return prisma.message.count({
      where: {
        OR: unreadConditions,
        senderId: { not: userId },
        reads: { none: { userId } },
        deletedAt: null,
      },
    });
  },
};