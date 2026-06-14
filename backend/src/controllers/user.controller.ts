import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler";
import { emitToUser } from "../utils/socket";
import { Server } from "socket.io";
import fs from "fs/promises";

export const userController = {
  getMyProfile: asyncHandler(async (req: Request, res: Response) => {
    const myId = (req as any).user!.id;
    const data = await userService.getProfile(myId, myId);
    res.json({
      success: true,
      message: "Lấy thông tin cá nhân thành công.",
      data,
    });
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const targetId = Number(req.params.id);
    if (isNaN(targetId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID người dùng không hợp lệ." });
    }

    const data = await userService.getProfile(targetId, (req as any).user?.id);
    res.json({
      success: true,
      message: "Lấy hồ sơ người dùng thành công.",
      data,
    });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const data = await userService.updateProfile(userId, req.body);
    res.json({ success: true, message: "Cập nhật hồ sơ thành công.", data });
  }),

  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh đại diện để tải lên.",
      });
    }

    try {
      const data = await userService.uploadAvatar(
        (req as any).user!.id,
        req.file.filename,
      );
      res.json({
        success: true,
        message: "Tải lên ảnh đại diện thành công.",
        data,
      });
    } catch (error) {
      if (req.file) await fs.unlink(req.file.path).catch(console.error);
      throw error;
    }
  }),

  deleteAvatar: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const data = await userService.deleteAvatar(userId);
    res.json({ success: true, message: "Xóa ảnh đại diện thành công.", data });
  }),

  uploadCover: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ảnh bìa để tải lên." });
    }

    try {
      const data = await userService.uploadCover(
        (req as any).user!.id,
        req.file.filename,
      );
      res.json({ success: true, message: "Tải lên ảnh bìa thành công.", data });
    } catch (error) {
      if (req.file) await fs.unlink(req.file.path).catch(console.error);
      throw error;
    }
  }),

  follow: asyncHandler(async (req: Request, res: Response) => {
    const followerId = (req as any).user!.id;
    const targetUserId = Number(req.params.userId);
    if (isNaN(targetUserId)) {
      return res
        .status(400)
        .json({ success: false, message: "ID mục tiêu không hợp lệ." });
    }

    const { notification } = await userService.follow(followerId, targetUserId);

    const extendedReq = req as any;
    if (notification && extendedReq.io) {
      emitToUser(
        extendedReq.io,
        String(targetUserId),
        "notification:new",
        notification,
      );
    }
    res.json({ success: true, message: "Theo dõi người dùng thành công." });
  }),

  unfollow: asyncHandler(async (req: Request, res: Response) => {
    const followerId = (req as any).user!.id;
    const targetUserId = Number(req.params.userId);

    await userService.unfollow(followerId, targetUserId);
    res.json({ success: true, message: "Hủy theo dõi người dùng thành công." });
  }),

  getFollowers: asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const data = await userService.getFollowers(
      userId,
      page,
      limit,
      (req as any).user?.id,
    );
    res.json({
      success: true,
      message: "Lấy danh sách người theo dõi thành công.",
      data,
    });
  }),

  getFollowing: asyncHandler(async (req: Request, res: Response) => {
    const userId = Number(req.params.userId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const data = await userService.getFollowing(
      userId,
      page,
      limit,
      (req as any).user?.id,
    );
    res.json({
      success: true,
      message: "Lấy danh sách người đang theo dõi thành công.",
      data,
    });
  }),

  block: asyncHandler(async (req: Request, res: Response) => {
    const blockerId = (req as any).user!.id;
    const targetUserId = Number(req.params.userId);

    await userService.block(blockerId, targetUserId);
    res.json({ success: true, message: "Chặn người dùng thành công." });
  }),

  unblock: asyncHandler(async (req: Request, res: Response) => {
    const blockerId = (req as any).user!.id;
    const targetUserId = Number(req.params.userId);

    await userService.unblock(blockerId, targetUserId);
    res.json({ success: true, message: "Bỏ chặn người dùng thành công." });
  }),

  getSuggested: asyncHandler(async (req: Request, res: Response) => {
    const requesterId = (req as any).user!.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;

    const data = await userService.getSuggestedUsers(requesterId, page, limit);
    res.json({
      success: true,
      message: "Lấy danh sách gợi ý kết bạn thành công.",
      data,
    });
  }),
};
