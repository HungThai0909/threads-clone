import { prisma } from "../utils/prisma";
import { AppError, NotFoundError } from "../utils/errors";
import { redis } from "../utils/redis";
import fs from "fs/promises";
import path from "path";

const publicSelect = {
  id: true,
  username: true,
  fullname: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
  isVerified: true,
  createdAt: true,
  _count: { select: { followers: true, following: true, posts: true } },
};

const miniSelect = {
  id: true,
  username: true,
  fullname: true,
  avatarUrl: true,
  isVerified: true,
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const userService = {
  async getProfile(targetId: number, requesterId?: number) {
    const user = await prisma.user.findUnique({
      where: { id: targetId, deletedAt: null },
      select: {
        ...publicSelect,
        ...(requesterId && {
          blockedBy: {
            where: { blockerId: requesterId },
            select: { blockerId: true },
          },
          blocking: {
            where: { blockedId: requesterId },
            select: { blockerId: true },
          },
          followers: {
            where: { followerId: requesterId },
            select: { followerId: true },
          },
          following: {
            where: { followingId: requesterId },
            select: { followingId: true },
          },
        }),
      },
    });

    if (!user) throw new NotFoundError("User");

    if (requesterId) {
      const u = user as any;
      const isBlocked =
        (u.blockedBy && u.blockedBy.length > 0) ||
        (u.blocking && u.blocking.length > 0);
      if (isBlocked) throw new NotFoundError("User");

      delete u.blockedBy;
      delete u.blocking;

      u.isFollowing = !!(u.followers && u.followers.length > 0);
      u.isFollowedBy = !!(u.following && u.following.length > 0);

      delete u.followers;
      delete u.following;
    } else {
      const u = user as any;
      u.isFollowing = false;
      u.isFollowedBy = false;
    }

    return user;
  },

  async updateProfile(
    userId: number,
    data: { fullname?: string; bio?: string; username?: string },
  ) {
    const updateData: Record<string, any> = {};

    if (data.fullname !== undefined) updateData.fullname = data.fullname;
    if (data.bio !== undefined) updateData.bio = data.bio;

    if (data.username) {
      const conflict = await prisma.user.findFirst({
        where: { username: data.username, NOT: { id: userId } },
        select: { id: true },
      });
      if (conflict) throw new AppError("Username already taken", 409);
      updateData.username = data.username;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: publicSelect,
    });

    await redis.del(`user:cache:${userId}`);
    return updatedUser;
  },

  async uploadAvatar(userId: number, filename: string) {
    const old = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    try {
      if (old?.avatarUrl?.startsWith("/uploads/")) {
        const p = path.join(process.cwd(), old.avatarUrl);
        if (await fileExists(p)) await fs.unlink(p).catch(console.error);
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: `/uploads/${filename}` },
        select: { id: true, avatarUrl: true },
      });

      await redis.del(`user:cache:${userId}`);
      return updated;
    } catch (error) {
      const newFilePath = path.join(process.cwd(), "uploads", filename);
      if (await fileExists(newFilePath))
        await fs.unlink(newFilePath).catch(console.error);
      throw error;
    }
  },

  async deleteAvatar(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl && user.avatarUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), user.avatarUrl);
      if (await fileExists(filePath)) {
        await fs.unlink(filePath).catch(console.error);
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: publicSelect,
    });

    await redis.del(`user:cache:${userId}`);
    return updated;
  },

  async uploadCover(userId: number, filename: string) {
    const old = await prisma.user.findUnique({
      where: { id: userId },
      select: { coverUrl: true },
    });

    try {
      if (old?.coverUrl?.startsWith("/uploads/")) {
        const p = path.join(process.cwd(), old.coverUrl);
        if (await fileExists(p)) await fs.unlink(p).catch(console.error);
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { coverUrl: `/uploads/${filename}` },
        select: { id: true, coverUrl: true },
      });

      await redis.del(`user:cache:${userId}`);
      return updated;
    } catch (error) {
      const newFilePath = path.join(process.cwd(), "uploads", filename);
      if (await fileExists(newFilePath))
        await fs.unlink(newFilePath).catch(console.error);
      throw error;
    }
  },

  async follow(followerId: number, targetUserId: number) {
    if (targetUserId === followerId)
      throw new AppError("Cannot follow yourself", 400);

    const target = await prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundError("User");

    const blockExists = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: followerId },
        ],
      },
    });
    if (blockExists)
      throw new AppError(
        "Cannot follow this user due to block restriction",
        400,
      );

    const exists = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId: targetUserId },
      },
    });
    if (exists) throw new AppError("Already following", 400);

    await prisma.follow.create({
      data: { followerId, followingId: targetUserId },
    });

    const notification = await prisma.notification.create({
      data: { senderId: followerId, receiverId: targetUserId, type: "follow" },
      include: { sender: { select: miniSelect } },
    });
    return { targetId: targetUserId, notification };
  },

  async unfollow(followerId: number, targetUserId: number) {
    if (targetUserId === followerId)
      throw new AppError("Cannot unfollow yourself", 400);

    const target = await prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundError("User");

    await prisma.follow.deleteMany({
      where: { followerId, followingId: targetUserId },
    });
    return true;
  },

  async getFollowers(
    userId: number,
    page = 1,
    limit = 20,
    requesterId?: number,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) throw new NotFoundError("User");

    const follows = await prisma.follow.findMany({
      where: { followingId: user.id },
      select: { follower: { select: miniSelect }, createdAt: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (requesterId) {
      return await Promise.all(
        follows.map(async (item: any) => {
          const isFollowing = await prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: requesterId,
                followingId: item.follower.id,
              },
            },
          });
          item.follower.isFollowing = !!isFollowing;
          return item;
        }),
      );
    }

    return follows;
  },

  async getFollowing(
    userId: number,
    page = 1,
    limit = 20,
    requesterId?: number,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!user) throw new NotFoundError("User");

    const follows = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { following: { select: miniSelect }, createdAt: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (requesterId) {
      return await Promise.all(
        follows.map(async (item: any) => {
          const isFollowing = await prisma.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: requesterId,
                followingId: item.following.id,
              },
            },
          });
          item.following.isFollowing = !!isFollowing;
          return item;
          return item;
        }),
      );
    }

    return follows;
  },

  async block(blockerId: number, targetUserId: number) {
    if (targetUserId === blockerId)
      throw new AppError("Cannot block yourself", 400);

    const target = await prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundError("User");

    const existBlock = await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId: targetUserId } },
    });
    if (existBlock) return true;

    await prisma.$transaction([
      prisma.userBlock.create({ data: { blockerId, blockedId: targetUserId } }),
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: targetUserId },
            { followerId: targetUserId, followingId: blockerId },
          ],
        },
      }),
    ]);
    return true;
  },

  async unblock(blockerId: number, targetUserId: number) {
    const target = await prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!target) throw new NotFoundError("User");

    await prisma.userBlock.deleteMany({
      where: { blockerId, blockedId: targetUserId },
    });
    return true;
  },

  async getSuggestedUsers(requesterId: number, page = 1, limit = 5) {
    const followedUsers = await prisma.follow.findMany({
      where: { followerId: requesterId },
      select: { followingId: true },
    });
    const followedIds = followedUsers.map((f) => f.followingId);

    const blockedUsers = await prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: requesterId }, { blockedId: requesterId }],
      },
      select: { blockerId: true, blockedId: true },
    });
    const blockedIds = blockedUsers.flatMap((b) => [b.blockerId, b.blockedId]);

    const excludeUserIds = Array.from(
      new Set([requesterId, ...followedIds, ...blockedIds]),
    );

    return prisma.user.findMany({
      where: {
        id: { notIn: excludeUserIds },
        deletedAt: null,
      },
      select: {
        ...miniSelect,
        bio: true,
        _count: {
          select: { followers: true },
        },
      },
      orderBy: [{ isVerified: "desc" }, { followers: { _count: "desc" } }],
      skip: (page - 1) * limit,
      take: limit,
    });
  },
};
