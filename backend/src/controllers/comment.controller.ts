import { Request, Response } from "express";
import { commentService } from "../services/comment.service";
import { asyncHandler } from "../utils/asyncHandler";
import { getCommentsQuerySchema } from "../validators/comment.validator";

export const commentController = {
  createComment: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    if (isNaN(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bài viết không hợp lệ." });
    }
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Nội dung bình luận không được để trống.",
      });
    }
    const data = await commentService.createComment(
      {
        userId: (req as any).user!.id,
        postId,
        content,
      },
      (req as any).io,
    );
    res
      .status(201)
      .json({ success: true, message: "Tạo bình luận thành công.", data });
  }),

  getComments: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    if (isNaN(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bài viết không hợp lệ." });
    }
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Math.min(100, Number(req.query.limit)) : 20;
    const data = await commentService.getComments(
      postId,
      (req as any).user?.id,
      cursor,
      limit,
    );
    res.json({
      success: true,
      message: "Lấy danh sách bình luận thành công.",
      data,
    });
  }),

  updateComment: asyncHandler(async (req: Request, res: Response) => {
    const commentId = Number(req.params.commentId);
    if (isNaN(commentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bình luận không hợp lệ." });
    }

    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Nội dung cập nhật không được để trống.",
      });
    }

    const data = await commentService.updateComment(
      commentId,
      (req as any).user!.id,
      content,
    );
    res.json({
      success: true,
      message: "Cập nhật bình luận thành công.",
      data,
    });
  }),

  deleteComment: asyncHandler(async (req: Request, res: Response) => {
    const commentId = Number(req.params.commentId);
    if (isNaN(commentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bình luận không hợp lệ." });
    }

    await commentService.deleteComment(commentId, (req as any).user!.id);
    res.json({ success: true, message: "Xóa bình luận thành công." });
  }),

  createReply: asyncHandler(async (req: Request, res: Response) => {
    const commentId = Number(req.params.commentId);
    if (isNaN(commentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bình luận gốc không hợp lệ." });
    }

    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Nội dung phản hồi không được để trống.",
      });
    }

    const data = await commentService.createReply({
      userId: (req as any).user!.id,
      commentId,
      content,
    });

    res
      .status(201)
      .json({ success: true, message: "Tạo phản hồi thành công.", data });
  }),

  getReplies: asyncHandler(async (req: Request, res: Response) => {
    const commentId = Number(req.params.commentId);
    if (isNaN(commentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bình luận gốc không hợp lệ." });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit as string) || 20),
    );

    const data = await commentService.getRepliesForComment(
      commentId,
      page,
      limit,
    );
    res.json({
      success: true,
      message: "Lấy danh sách phản hồi thành công.",
      data,
    });
  }),

  updateReply: asyncHandler(async (req: Request, res: Response) => {
    const replyId = Number(req.params.replyId);
    if (isNaN(replyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã phản hồi không hợp lệ." });
    }

    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Nội dung cập nhật không được để trống.",
      });
    }

    const data = await commentService.updateReply(
      replyId,
      (req as any).user!.id,
      content,
    );
    res.json({ success: true, message: "Cập nhật phản hồi thành công.", data });
  }),

  deleteReply: asyncHandler(async (req: Request, res: Response) => {
    const replyId = Number(req.params.replyId);
    if (isNaN(replyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã phản hồi không hợp lệ." });
    }

    await commentService.deleteReply(replyId, (req as any).user!.id);
    res.json({ success: true, message: "Xóa phản hồi thành công." });
  }),

  likeComment: asyncHandler(async (req: Request, res: Response) => {
    const commentId = Number(req.params.commentId);
    if (isNaN(commentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bình luận không hợp lệ." });
    }

    const data = await commentService.likeComment(
      commentId,
      (req as any).user!.id,
    );
    if ("alreadyLiked" in data) {
      return res.json({
        success: true,
        message: "Bạn đã thích bình luận này trước đó.",
      });
    }

    res.json({ success: true, message: "Thích bình luận thành công.", data });
  }),

  unlikeComment: asyncHandler(async (req: Request, res: Response) => {
    const commentId = Number(req.params.commentId);
    if (isNaN(commentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bình luận không hợp lệ." });
    }

    const data = await commentService.unlikeComment(
      commentId,
      (req as any).user!.id,
    );
    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Bạn chưa thích bình luận này hoặc bình luận không tồn tại.",
      });
    }

    res.json({
      success: true,
      message: "Bỏ thích bình luận thành công.",
      data,
    });
  }),

  likeReply: asyncHandler(async (req: Request, res: Response) => {
    const replyId = Number(req.params.replyId);
    if (isNaN(replyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã phản hồi không hợp lệ." });
    }

    const data = await commentService.likeReply(replyId, (req as any).user!.id);
    if ("alreadyLiked" in data) {
      return res.json({
        success: true,
        message: "Bạn đã thích phản hồi này trước đó.",
      });
    }

    res.json({ success: true, message: "Thích phản hồi thành công.", data });
  }),

  unlikeReply: asyncHandler(async (req: Request, res: Response) => {
    const replyId = Number(req.params.replyId);
    if (isNaN(replyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã phản hồi không hợp lệ." });
    }

    const data = await commentService.unlikeReply(
      replyId,
      (req as any).user!.id,
    );
    if (!data) {
      return res
        .status(400)
        .json({ success: false, message: "Bạn chưa thích phản hồi này." });
    }

    res.json({ success: true, message: "Bỏ thích phản hồi thành công.", data });
  }),
};
