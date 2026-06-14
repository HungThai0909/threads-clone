import { prisma } from "../utils/prisma";
import { AppError, NotFoundError } from "../utils/errors";

export interface CreatePostInput {
  userId: number;
  content?: string | null;
  visibility?: "public" | "followers" | "private";
  imageUrls?: string[];
  quotePostId?: number | null;
  parentId?: number | null;
}

const authorSelect = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
  isVerified: true,
};

export const postService = {
  async _executeCreatePost(
    tx: any,
    input: CreatePostInput & { type?: string },
  ): Promise<any> {
    if (input.quotePostId) {
      const originPost = await tx.post.findUnique({
        where: { id: input.quotePostId, deletedAt: null },
      });
      if (!originPost) throw new NotFoundError("Bài viết gốc để trích dẫn");

      if (input.type === "quote") {
        await tx.post.update({
          where: { id: input.quotePostId },
          data: { quotesCount: { increment: 1 } },
        });
      }
    }

    const postData: any = {
      userId: input.userId,
      visibility: input.visibility || "public",
      type: input.type || (input.quotePostId ? "quote" : "post"),
      content: input.content || null,
      quotePostId: input.quotePostId || null,
      images: {
        create: (input.imageUrls || []).map((url, idx) => ({
          imageUrl: url,
          imageOrder: idx,
        })),
      },
    };

    const post = await tx.post.create({
      data: postData,
      include: {
        author: { select: authorSelect },
        images: true,
        quotePost: {
          include: { author: { select: authorSelect }, images: true },
        },
      },
    });

    if (input.content && input.content.trim() !== "") {
      const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
      const matches = input.content.match(hashtagRegex);

      if (matches) {
        const uniqueHashtags = [
          ...new Set(
            matches.map((tag) => tag.replace("#", "").toLowerCase().trim()),
          ),
        ].filter(Boolean);

        for (const tagName of uniqueHashtags) {
          const hashtag = await tx.hashtag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });

          await tx.postHashtag.create({
            data: {
              postId: post.id,
              hashtagId: hashtag.id,
            },
          });

          await tx.hashtag.update({
            where: { id: hashtag.id },
            data: { postsCount: { increment: 1 } },
          });
        }
      }
    }

    return post;
  },

  async createPost(input: CreatePostInput & { type?: string }) {
    return prisma.$transaction(async (tx) => {
      return this._executeCreatePost(tx, input);
    });
  },

  async getPostDetail(postId: number, requesterId?: number) {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
      include: {
        author: { select: authorSelect },
        images: { orderBy: { imageOrder: "asc" } },
        quotePost: {
          include: { author: { select: authorSelect }, images: true },
        },
        comments: {
          where: { deletedAt: null },
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { author: { select: authorSelect } },
        },
      },
    });

    if (!post) throw new NotFoundError("Bài viết");

    if (requesterId && requesterId !== post.userId) {
      const isBlocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: requesterId, blockedId: post.userId },
            { blockerId: post.userId, blockedId: requesterId },
          ],
        },
      });
      if (isBlocked) throw new NotFoundError("Bài viết");
    }

    let isLiked = false;
    if (requesterId) {
      const like = await prisma.postLike.findUnique({
        where: { userId_postId: { userId: requesterId, postId } },
      });
      isLiked = !!like;
    }

    return { ...post, isLiked };
  },

  async updatePost(postId: number, userId: number, content: string) {
    const post = await prisma.post.findFirst({
      where: { id: postId, userId, deletedAt: null },
    });
    if (!post) throw new NotFoundError("Bài viết hoặc bạn không có quyền sửa");

    return prisma.post.update({
      where: { id: postId },
      data: { content, updatedAt: new Date() },
      include: { images: true },
    });
  },

  async deletePost(postId: number, userId: number) {
    const post = await prisma.post.findFirst({
      where: { id: postId, userId, deletedAt: null },
      include: { hashtags: true },
    });
    if (!post) throw new NotFoundError("Bài viết hoặc bạn không có quyền xóa");

    return prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: { deletedAt: new Date() },
      });

      if (post.type === "quote" && post.quotePostId) {
        await tx.post.update({
          where: { id: post.quotePostId },
          data: { quotesCount: { decrement: 1 } },
        });
      }

      if (post.hashtags && post.hashtags.length > 0) {
        for (const postTag of post.hashtags) {
          await tx.hashtag.update({
            where: { id: postTag.hashtagId },
            data: { postsCount: { decrement: 1 } },
          });
        }
      }
    });
  },

  async getUserPosts(
    targetUserId: number,
    requesterId?: number,
    page = 1,
    limit = 20,
  ) {
    if (requesterId) {
      const isBlocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: requesterId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: requesterId },
          ],
        },
      });
      if (isBlocked) return [];
    }

    return prisma.post.findMany({
      where: { userId: targetUserId, deletedAt: null, visibility: "public" },
      include: {
        author: { select: authorSelect },
        images: { orderBy: { imageOrder: "asc" } },
        quotePost: {
          include: { author: { select: authorSelect }, images: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  },

  async getFeed(requesterId?: number, page = 1, limit = 20) {
    let blockedUserIds: number[] = [];
    if (requesterId) {
      const blocks = await prisma.userBlock.findMany({
        where: { OR: [{ blockerId: requesterId }, { blockedId: requesterId }] },
        select: { blockerId: true, blockedId: true },
      });
      blockedUserIds = blocks.map((b) =>
        b.blockerId === requesterId ? b.blockedId : b.blockerId,
      );
    }

    return prisma.post.findMany({
      where: {
        deletedAt: null,
        visibility: "public",
        userId: { notIn: blockedUserIds },
      },
      include: {
        author: { select: authorSelect },
        images: { orderBy: { imageOrder: "asc" } },
        quotePost: {
          include: { author: { select: authorSelect }, images: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  },

  async likePost(postId: number, userId: number) {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundError("Bài viết");

    const exist = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (exist) return;

    await prisma.$transaction([
      prisma.postLike.create({ data: { userId, postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
  },

  async getLikedPosts(
    targetUserId: number,
    requesterId?: number,
    page = 1,
    limit = 20,
  ) {
    if (requesterId) {
      const isBlocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: requesterId, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: requesterId },
          ],
        },
      });
      if (isBlocked) return [];
    }

    const likedRecords = await prisma.postLike.findMany({
      where: {
        userId: targetUserId,
        post: {
          deletedAt: null,
          visibility: "public",
        },
      },
      include: {
        post: {
          include: {
            author: { select: authorSelect },
            images: { orderBy: { imageOrder: "asc" } },
            quotePost: {
              include: { author: { select: authorSelect }, images: true },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return likedRecords.map((record) => record.post);
  },

  async unlikePost(postId: number, userId: number) {
    const exist = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (!exist) return;

    await prisma.$transaction([
      prisma.postLike.delete({ where: { userId_postId: { userId, postId } } }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
  },

  async replyPost(originPostId: number, input: any) {
    return prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: originPostId },
        data: { commentsCount: { increment: 1 } },
      });

      if (input.parentId) {
        return tx.commentReply.create({
          data: {
            commentId: input.parentId,
            userId: input.userId,
            content: input.content || "",
          },
          include: { author: { select: authorSelect } },
        });
      }

      return tx.postComment.create({
        data: {
          postId: originPostId,
          userId: input.userId,
          content: input.content || "",
        },
        include: { author: { select: authorSelect } },
      });
    });
  },

  async quotePost(originPostId: number, input: CreatePostInput) {
    return prisma.$transaction(async (tx) => {
      return this._executeCreatePost(tx, {
        ...input,
        quotePostId: originPostId,
        type: "quote",
      });
    });
  },

 async repost(postId: number, userId: number) {
  const originPost = await prisma.post.findUnique({
    where: { id: postId, deletedAt: null },
  });
  if (!originPost) throw new NotFoundError("Bài viết gốc");

  const alreadyReposted = await prisma.post.findFirst({
    where: { userId, quotePostId: postId, type: "repost", deletedAt: null },
  });
  if (alreadyReposted)
    throw new AppError("Bạn đã chia sẻ bài viết này rồi", 400);

  return prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: { repostsCount: { increment: 1 } },
    });

    return tx.post.create({
      data: {
        userId,
        quotePostId: postId,
        type: "repost",
        visibility: "public",
      },
      include: {
        author: { select: authorSelect },
        images: true,
        quotePost: {
          include: { 
            author: { select: authorSelect }, 
            images: { orderBy: { imageOrder: "asc" } } 
          },
        },
      },
    });
  });
},

  async removeRepost(postId: number, userId: number) {
    const repost = await prisma.post.findFirst({
      where: { userId, quotePostId: postId, type: "repost", deletedAt: null },
    });
    if (!repost) throw new NotFoundError("Bản chia sẻ của bạn");

    await prisma.$transaction([
      prisma.post.update({
        where: { id: repost.id },
        data: { deletedAt: new Date() },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { repostsCount: { decrement: 1 } },
      }),
    ]);
  },
};
