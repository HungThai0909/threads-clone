import { Request, Response } from "express";
import { hashtagService } from "../services/hashtag.service";
import { asyncHandler } from "../utils/asyncHandler";

export const hashtagController = {
  createHashtag: asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;
    const data = await hashtagService.createOrGet(name);
    res
      .status(201)
      .json({ success: true, message: "Tạo hashtag thành công.", data });
  }),

  searchHashtag: asyncHandler(async (req: Request, res: Response) => {
    const q = String(req.query.q || "").trim();
    const data = await hashtagService.search(q);
    res.json({ success: true, message: "Tìm kiếm hashtag thành công.", data });
  }),

  getTrending: asyncHandler(async (req: Request, res: Response) => {
    const data = await hashtagService.getTrending();
    res.json({
      success: true,
      message: "Lấy danh sách hashtag thịnh hành thành công.",
      data,
    });
  }),

  getPostsByHashtag: asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;
    const { cursor, limit } = req.query;
    const requesterId = (req as any).user?.id;

    const parsedLimit = limit ? Number(limit) : 15;
    const parsedCursor = cursor ? Number(cursor) : undefined;

    const posts = await hashtagService.getPostsByHashtag(
      String(name || ""),
      requesterId,
      parsedCursor,
      parsedLimit,
    );

    res.status(200).json({
      success: true,
      data: posts,
    });
  }),
};
