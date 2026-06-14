import { prisma } from "../utils/prisma";
import { AppError } from "../utils/errors";

export const hashtagService = {
  async createOrGet(name: string) {
    const normalized = name.replace(/^#/, "").toLowerCase().trim();

    if (!normalized || !/^[a-z0-9_]+$/.test(normalized)) {
      throw new AppError("Tên hashtag không hợp lệ.");
    }

    return prisma.hashtag.upsert({
      where: { name: normalized },
      update: {},
      create: { name: normalized },
    });
  },

  async search(query: string, limit = 10) {
    const cleanQuery = query.replace(/^#/, "").toLowerCase().trim();
    if (!cleanQuery) return [];

    return prisma.hashtag.findMany({
      where: { name: { contains: cleanQuery } },
      orderBy: { postsCount: "desc" },
      take: limit,
      select: { id: true, name: true, postsCount: true },
    });
  },

  async getTrending(limit = 10) {
    return prisma.hashtag.findMany({
      where: { postsCount: { gt: 0 } },
      orderBy: { postsCount: "desc" },
      take: limit,
      select: { id: true, name: true, postsCount: true },
    });
  },

  async getPostsByHashtag(
    cleanName: string,
    requesterId?: number,
    cursor?: any,
    limit: any = 15,
  ) {
    const normalizedName = cleanName.replace(/#/g, "").toLowerCase().trim();
    if (!normalizedName) return { success: true, data: [] };

    const tag = await prisma.hashtag.findUnique({
      where: { name: normalizedName },
    });

    if (!tag) return { success: true, data: [] };

    const parsedLimit = limit && !isNaN(Number(limit)) ? Number(limit) : 15;

    let parsedCursor: number | undefined = undefined;
    if (
      cursor &&
      cursor !== "undefined" &&
      cursor !== "null" &&
      !isNaN(Number(cursor))
    ) {
      parsedCursor = Number(cursor);
    }

    const whereConditions: any = {
      deletedAt: null,
      hashtags: { some: { hashtagId: tag.id } },
    };

    const visibilityConditions: any[] = [];
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
      if (blockedUserIds.length > 0)
        whereConditions.userId = { notIn: blockedUserIds };
      const followingIds = following.map((f) => f.followingId);
      visibilityConditions.push(
        { visibility: "public" },
        { userId: requesterId },
        { visibility: "followers", userId: { in: followingIds } },
      );
    } else {
      visibilityConditions.push({ visibility: "public" });
    }
    whereConditions.OR = visibilityConditions;

    const posts = await prisma.post.findMany({
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

    const formattedPosts = posts.map((post) => ({
      ...post,
      isLiked: requesterId ? (post as any).likes?.length > 0 : false,
      likes: undefined,
    }));

    return {
      success: true,
      data: formattedPosts,
    };
  },
};
