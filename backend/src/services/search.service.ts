import { prisma } from "../utils/prisma";
import { NotFoundError } from "../utils/errors";

const miniSelect = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
  isVerified: true,
};

export const searchService = {
  async searchUsers(query: string, requesterId?: number, page = 1, limit = 20) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const whereConditions: any = {
      deletedAt: null,
      OR: [
        { username: { contains: cleanQuery, mode: "insensitive" } },
        { fullname: { contains: cleanQuery, mode: "insensitive" } },
        { email: { contains: cleanQuery, mode: "insensitive" } },
        {
          posts: {
            some: {
              deletedAt: null,
              content: { contains: cleanQuery, mode: "insensitive" },
              visibility: "public",
            },
          },
        },
      ],
    };

    if (requesterId) {
      const blocks = await prisma.userBlock.findMany({
        where: { OR: [{ blockerId: requesterId }, { blockedId: requesterId }] },
        select: { blockerId: true, blockedId: true },
      });

      const blockedUserIds = blocks.map((b) =>
        b.blockerId === requesterId ? b.blockedId : b.blockerId,
      );

      whereConditions.NOT = {
        id: { in: [...blockedUserIds, requesterId] },
      };
    }

    return prisma.user.findMany({
      where: whereConditions,
      select: {
        id: true,
        username: true,
        fullname: true,
        avatarUrl: true,
        isVerified: true,
        bio: true,
        _count: { select: { followers: true } },
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { followers: { _count: "desc" } },
    });
  },

  async searchPosts(
    query: string,
    requesterId?: number,
    cursor?: number,
    limit = 15,
  ) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const parsedLimit = Number(limit) || 15;
    const parsedCursor = cursor ? Number(cursor) : undefined;

    const whereConditions: any = {
      deletedAt: null,
      type: { in: ["post", "quote"] },
      content: { contains: cleanQuery, mode: "insensitive" },
    };

    const visibilityQuery: any[] = [{ visibility: "public" }];

    if (requesterId) {
      const [blocks, following] = await Promise.all([
        prisma.userBlock.findMany({
          where: {
            OR: [{ blockerId: requesterId }, { blockedId: requesterId }],
          },
          select: { blockerId: true, blockedId: true },
        }),
        prisma.follow.findMany({
          where: { followerId: requesterId },
          select: { followingId: true },
        }),
      ]);

      const blockedUserIds = blocks.map((b) =>
        b.blockerId === requesterId ? b.blockedId : b.blockerId,
      );
      if (blockedUserIds.length > 0) {
        whereConditions.userId = { notIn: blockedUserIds };
      }

      const followingIds = following.map((f) => f.followingId);

      visibilityQuery.push(
        { userId: requesterId },
        {
          visibility: "followers",
          userId: { in: followingIds },
        },
      );
    }

    whereConditions.OR = visibilityQuery;

    return prisma.post.findMany({
      where: whereConditions,
      select: {
        id: true,
        content: true,
        type: true,
        likesCount: true,
        commentsCount: true,
        repostsCount: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            fullname: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        images: {
          select: { id: true, imageUrl: true },
          orderBy: { imageOrder: "asc" as const },
        },
        ...(requesterId
          ? {
              likes: {
                where: { userId: requesterId },
                select: { userId: true },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: parsedLimit,
      ...(parsedCursor ? { skip: 1, cursor: { id: parsedCursor } } : {}),
    });
  },

  async saveSearchHistory(userId: number, targetId: number) {
    if (userId === targetId) return;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetId, deletedAt: null },
      select: { id: true },
    });
    if (!targetUser)
      throw new NotFoundError("Người dùng không tồn tại hoặc đã bị xóa.");

    return prisma.searchHistory.upsert({
      where: {
        userId_targetId: { userId, targetId },
      },
      update: {
        createdAt: new Date(),
      },
      create: {
        userId,
        targetId,
      },
    });
  },

  async getSearchHistory(userId: number, limit = 10) {
    const historyRecords = await prisma.searchHistory.findMany({
      where: {
        userId: userId,
        target: {
          deletedAt: null,
          blockedBy: {
            none: { blockerId: userId },
          },
          blocking: {
            none: { blockedId: userId },
          },
        },
      },
      take: Number(limit) || 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        target: {
          select: {
            id: true,
            username: true,
            fullname: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });
    return historyRecords;
  },

  async deleteSearchHistoryItem(userId: number, historyId: number) {
    await prisma.searchHistory.deleteMany({
      where: {
        id: historyId,
        userId: userId,
      },
    });
    return true;
  },

  async clearAllSearchHistory(userId: number) {
    await prisma.searchHistory.deleteMany({
      where: { userId },
    });
    return true;
  },
};
