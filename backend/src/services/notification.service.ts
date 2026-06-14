import { prisma } from "../utils/prisma";
import { NotFoundError } from "../utils/errors";

export const notificationService = {
  async getAll(userId: number, page = 1, limit = 20) {
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 20;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { receiverId: userId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullname: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
          post: { select: { id: true, content: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (parsedPage - 1) * parsedLimit,
        take: parsedLimit,
      }),
      prisma.notification.count({
        where: { receiverId: userId, isRead: false },
      }),
    ]);
    return { notifications, unreadCount };
  },

  async markRead(id: number, userId: number) {
    const notification = await prisma.notification.findFirst({
      where: { id, receiverId: userId },
    });

    if (!notification) {
      throw new NotFoundError(
        "Thông báo không tồn tại hoặc bạn không có quyền truy cập",
      );
    }

    if (notification.isRead) {
      const currentUnreadCount = await prisma.notification.count({
        where: { receiverId: userId, isRead: false },
      });
      return { currentUnreadCount, isUpdated: false };
    }

    const result = await prisma.notification.updateMany({
      where: {
        id,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    const isUpdated = result.count > 0;

    const currentUnreadCount = await prisma.notification.count({
      where: { receiverId: userId, isRead: false },
    });

    return { currentUnreadCount, isUpdated };
  },

  async markAllRead(userId: number) {
    await prisma.notification.updateMany({
      where: { receiverId: userId, isRead: false },
      data: { isRead: true },
    });
    return { currentUnreadCount: 0 };
  },
};
