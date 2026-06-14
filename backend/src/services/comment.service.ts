import { prisma } from "../utils/prisma";
import { NotFoundError } from "../utils/errors";
import { Server } from "socket.io";

export interface CreateCommentInput {
  userId: number;
  postId: number;
  content: string;
}

export interface CreateReplyInput {
  userId: number;
  commentId: number;
  content: string;
}

const authorSelect = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
  isVerified: true,
};

export const commentService = {
  async createComment(input: CreateCommentInput, io?: Server) {
    const post = await prisma.post.findUnique({
      where: { id: input.postId, deletedAt: null },
    });
    if (!post) throw new NotFoundError("Bài viết");

    return prisma.$transaction(async (tx) => {
      const comment = await tx.postComment.create({
        data: {
          postId: input.postId,
          userId: input.userId,
          content: input.content,
        },
        include: { author: { select: authorSelect } },
      });

      await tx.post.update({
        where: { id: input.postId },
        data: { commentsCount: { increment: 1 } },
      });

      if (post.userId !== input.userId) {
        await tx.notification.create({
          data: {
            senderId: input.userId,
            receiverId: post.userId,
            postId: post.id,
            type: "comment",
          },
        });
      }

      return comment;
    });
  },

  async getComments(
    postId: number,
    requesterId?: number,
    cursor?: number,
    limit = 20,
  ) {
    const post = await prisma.post.findUnique({
      where: { id: postId, deletedAt: null },
    });
    if (!post) throw new NotFoundError("Bài viết");

    const comments = await prisma.postComment.findMany({
      where: { postId, deletedAt: null },
      include: {
        author: { select: authorSelect },
        replies: {
          where: { deletedAt: null },
          take: 3,
          orderBy: { createdAt: "asc" },
          include: { author: { select: authorSelect } },
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
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: "desc" },
    });

    return comments.map((comment) => {
      const { likes, ...rest } = comment as any;
      return {
        ...rest,
        isLiked: requesterId ? likes.length > 0 : false,
      };
    });
  },

  async updateComment(commentId: number, userId: number, content: string) {
    const comment = await prisma.postComment.findFirst({
      where: { id: commentId, userId, deletedAt: null },
    });
    if (!comment)
      throw new NotFoundError("Bình luận hoặc bạn không có quyền chỉnh sửa");

    return prisma.postComment.update({
      where: { id: commentId },
      data: { content, updatedAt: new Date() },
      include: { author: { select: authorSelect } },
    });
  },

  async deleteComment(commentId: number, userId: number) {
    const comment = await prisma.postComment.findFirst({
      where: { id: commentId, userId, deletedAt: null },
    });
    if (!comment)
      throw new NotFoundError("Bình luận hoặc bạn không có quyền xóa");

    return prisma.$transaction(async (tx) => {
      await tx.postComment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      });

      await tx.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      });
    });
  },

  async createReply(input: CreateReplyInput) {
    const rootComment = await prisma.postComment.findUnique({
      where: { id: input.commentId, deletedAt: null },
    });
    if (!rootComment) throw new NotFoundError("Bình luận gốc không tồn tại");

    return prisma.$transaction(async (tx) => {
      const reply = await tx.commentReply.create({
        data: {
          commentId: input.commentId,
          userId: input.userId,
          content: input.content,
        },
        include: { author: { select: authorSelect } },
      });

      await tx.postComment.update({
        where: { id: input.commentId },
        data: { repliesCount: { increment: 1 } },
      });

      if (rootComment.userId !== input.userId) {
        await tx.notification.create({
          data: {
            senderId: input.userId,
            receiverId: rootComment.userId,
            postId: rootComment.postId,
            type: "reply",
          },
        });
      }

      return reply;
    });
  },

  async getRepliesForComment(commentId: number, page = 1, limit = 20) {
    const rootComment = await prisma.postComment.findUnique({
      where: { id: commentId, deletedAt: null },
    });
    if (!rootComment) throw new NotFoundError("Bình luận gốc");

    return prisma.commentReply.findMany({
      where: { commentId, deletedAt: null },
      include: { author: { select: authorSelect } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "asc" },
    });
  },

  async updateReply(replyId: number, userId: number, content: string) {
    const reply = await prisma.commentReply.findFirst({
      where: { id: replyId, userId, deletedAt: null },
    });
    if (!reply) throw new NotFoundError("Phản hồi hoặc bạn không có quyền sửa");

    return prisma.commentReply.update({
      where: { id: replyId },
      data: { content, updatedAt: new Date() },
      include: { author: { select: authorSelect } },
    });
  },

  async deleteReply(replyId: number, userId: number) {
    const reply = await prisma.commentReply.findFirst({
      where: { id: replyId, userId, deletedAt: null },
    });
    if (!reply) throw new NotFoundError("Phản hồi hoặc bạn không có quyền xóa");

    return prisma.$transaction(async (tx) => {
      await tx.commentReply.update({
        where: { id: replyId },
        data: { deletedAt: new Date() },
      });

      await tx.postComment.update({
        where: { id: reply.commentId },
        data: { repliesCount: { decrement: 1 } },
      });
    });
  },

  async likeComment(commentId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.postComment.findUnique({
        where: { id: commentId, deletedAt: null },
      });
      if (!comment) throw new NotFoundError("Bình luận");

      const existingLike = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId } },
      });
      if (existingLike) return { alreadyLiked: true };

      await tx.commentLike.create({ data: { userId, commentId } });
      const updatedComment = await tx.postComment.update({
        where: { id: commentId },
        data: { likesCount: { increment: 1 } },
      });

      if (comment.userId !== userId) {
        await tx.notification.create({
          data: {
            senderId: userId,
            receiverId: comment.userId,
            postId: comment.postId,
            type: "like",
            metadata: { commentId } as any,
          },
        });
      }
      return updatedComment;
    });
  },

  async unlikeComment(commentId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const existingLike = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId } },
      });
      if (!existingLike) return null;

      await tx.commentLike.delete({
        where: { userId_commentId: { userId, commentId } },
      });
      return tx.postComment.update({
        where: { id: commentId },
        data: { likesCount: { decrement: 1 } },
      });
    });
  },

  async likeReply(replyId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const reply = await tx.commentReply.findUnique({
        where: { id: replyId, deletedAt: null },
      });
      if (!reply) throw new NotFoundError("Phản hồi");

      const existingLike = await tx.replyLike.findUnique({
        where: { userId_replyId: { userId, replyId } },
      });
      if (existingLike) return { alreadyLiked: true };

      await tx.replyLike.create({ data: { userId, replyId } });
      const updatedReply = await tx.commentReply.update({
        where: { id: replyId },
        data: { likesCount: { increment: 1 } },
      });

      const rootComment = await tx.postComment.findUnique({
        where: { id: reply.commentId },
      });

      if (reply.userId !== userId) {
        await tx.notification.create({
          data: {
            senderId: userId,
            receiverId: reply.userId,
            postId: rootComment?.postId || null,
            type: "like",
            metadata: { replyId, commentId: reply.commentId } as any,
          },
        });
      }
      return updatedReply;
    });
  },

  async unlikeReply(replyId: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      const existingLike = await tx.replyLike.findUnique({
        where: { userId_replyId: { userId, replyId } },
      });
      if (!existingLike) return null;

      await tx.replyLike.delete({
        where: { userId_replyId: { userId, replyId } },
      });
      return tx.commentReply.update({
        where: { id: replyId },
        data: { likesCount: { decrement: 1 } },
      });
    });
  },
};
