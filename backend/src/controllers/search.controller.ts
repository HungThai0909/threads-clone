import { Request, Response } from "express";
import { searchService } from "../services/search.service";
import { asyncHandler } from "../utils/asyncHandler";

export const searchController = {
  searchUsers: asyncHandler(async (req: Request, res: Response) => {
    const queryText = String(req.query.query || req.query.q || "").trim();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const requesterId = (req as any).user?.id;

    const users = await searchService.searchUsers(
      queryText,
      requesterId,
      page,
      limit,
    );

    res.json({
      success: true,
      message: "Tìm kiếm người dùng thành công.",
      data: users,
    });
  }),

  searchPosts: asyncHandler(async (req: Request, res: Response) => {
    const queryText = String(req.query.query || req.query.q || "").trim();
    const { cursor, limit } = req.query;
    const requesterId = (req as any).user?.id;

    const parsedLimit = limit ? Number(limit) : 15;

    const parsedCursor =
      cursor && cursor !== "undefined" && cursor !== "null"
        ? Number(cursor)
        : undefined;

    const posts = await searchService.searchPosts(
      queryText,
      requesterId,
      parsedCursor,
      parsedLimit,
    );

    res.json({
      success: true,
      message: "Tìm kiếm bài viết thành công.",
      data: posts,
    });
  }),

  saveSearchHistory: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const targetId = req.params.targetId as unknown as number;

    if (!targetId || isNaN(targetId)) {
      return res.status(400).json({
        success: false,
        message: "Mã người dùng mục tiêu không hợp lệ.",
      });
    }

    await searchService.saveSearchHistory(userId, targetId);
    res
      .status(201)
      .json({ success: true, message: "Lưu lịch sử tìm kiếm thành công." });
  }),

  getSearchHistory: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const limit = (req.query.limit as unknown as number) || 10;

    const data = await searchService.getSearchHistory(userId, limit);
    res.json({
      success: true,
      message: "Lấy lịch sử tìm kiếm thành công.",
      data,
    });
  }),

  deleteSearchHistoryItem: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    const historyId = req.params.id as unknown as number;

    await searchService.deleteSearchHistoryItem(userId, historyId);
    res.json({
      success: true,
      message: "Xóa mục lịch sử tìm kiếm thành công.",
    });
  }),

  clearAllSearchHistory: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user!.id;
    await searchService.clearAllSearchHistory(userId);
    res.json({
      success: true,
      message: "Xóa toàn bộ lịch sử tìm kiếm thành công.",
    });
  }),
};
