import { Request, Response } from "express";
import { notificationService } from "../services/notification.service";
import { asyncHandler } from "../utils/asyncHandler";
import { emitToUser } from "../utils/socket";

export const notificationController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const page = req.query.page as unknown as number;
    const limit = req.query.limit as unknown as number;

    const data = await notificationService.getAll(
      (req as any).user!.id,
      page,
      limit,
    );
    res.json({
      success: true,
      message: "Lấy danh sách thông báo thành công.",
      data,
    });
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as unknown as number;

    const { currentUnreadCount, isUpdated } =
      await notificationService.markRead(id, (req as any).user!.id);

    const extendedReq = req as any;
    if (isUpdated && extendedReq.io) {
      emitToUser(
        extendedReq.io,
        String(extendedReq.user!.id),
        "notification:badge_update",
        {
          unreadCount: currentUnreadCount,
        },
      );
    }

    res.json({
      success: true,
      message: "Đánh dấu thông báo đã đọc thành công.",
    });
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllRead((req as any).user!.id);

    const extendedReq = req as any;
    if (extendedReq.io) {
      emitToUser(
        extendedReq.io,
        String(extendedReq.user!.id),
        "notification:badge_update",
        {
          unreadCount: 0,
        },
      );
    }

    res.json({
      success: true,
      message: "Đánh dấu tất cả thông báo đã đọc thành công.",
    });
  }),
};
