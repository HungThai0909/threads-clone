import { Request, Response } from "express";
import { messageService } from "../services/message.service";
import { asyncHandler } from "../utils/asyncHandler";
import fs from "fs";

const deleteUploadedFile = (file?: Express.Multer.File) => {
  if (file && file.path) {
    fs.unlink(file.path, (err) => {
      if (err) console.error("Không thể xóa file rác:", err);
    });
  }
};

export const messageController = {
  getOrCreateConversation: asyncHandler(async (req: Request, res: Response) => {
    const { participantIds, name, isGroup } = req.body;

    const data = await messageService.getOrCreateConversation(
      (req as any).user!.id,
      {
        participantIds: participantIds || [],
        name: name,
        isGroup: isGroup,
      },
    );

    res
      .status(201)
      .json({ success: true, message: "Xử lý hội thoại thành công.", data });
  }),

  getConversations: asyncHandler(async (req: Request, res: Response) => {
    const data = await messageService.getConversations((req as any).user!.id);
    res.json({
      success: true,
      message: "Lấy danh sách hội thoại thành công.",
      data,
    });
  }),

  getMessages: asyncHandler(async (req: Request, res: Response) => {
    const conversationId = Number(req.params.conversationId);
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;

    if (isNaN(conversationId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã hội thoại không hợp lệ." });
    }

    const data = await messageService.getMessagesAndMarkRead(
      (req as any).user!.id,
      conversationId,
      cursor,
      (req as any).io,
    );
    res.json({
      success: true,
      message: "Lấy danh sách tin nhắn thành công.",
      data,
    });
  }),

  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    const { content } = req.body;
    const conversationId = Number(req.body.conversationId);
    const replyToMessageId = req.body.replyToMessageId
      ? Number(req.body.replyToMessageId)
      : undefined;

    if (isNaN(conversationId)) {
      deleteUploadedFile(file);
      return res
        .status(400)
        .json({ success: false, message: "Mã cuộc hội thoại không hợp lệ." });
    }
    const trimmedContent = content?.trim() || null;
    const imageUrl = file ? `/uploads/${file.filename}` : null;

    if (!trimmedContent && !imageUrl) {
      deleteUploadedFile(file);
      return res.status(400).json({
        success: false,
        message: "Nội dung tin nhắn hoặc hình ảnh không được trống.",
      });
    }

    try {
      const payload: {
        content?: string;
        imageUrl?: string;
        replyToMessageId?: number;
      } = {};
      if (trimmedContent) payload.content = trimmedContent;
      if (imageUrl) payload.imageUrl = imageUrl;
      if (replyToMessageId && !isNaN(replyToMessageId))
        payload.replyToMessageId = replyToMessageId;

      const data = await messageService.sendMessage(
        (req as any).user!.id,
        conversationId,
        payload,
        (req as any).io, // Đảm bảo io object được truyền chuẩn xác vào đây
      );

      res
        .status(201)
        .json({ success: true, message: "Gửi tin nhắn thành công.", data });
    } catch (error) {
      deleteUploadedFile(file);
      throw error;
    }
  }),

  seenMessage: asyncHandler(async (req: Request, res: Response) => {
    const messageId = Number(req.params.messageId);
    if (isNaN(messageId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã tin nhắn không hợp lệ." });
    }

    await messageService.markSingleMessageAsRead(
      (req as any).user!.id,
      messageId,
      (req as any).io,
    );
    res.json({
      success: true,
      message: "Đánh dấu tin nhắn đã đọc thành công.",
    });
  }),

  getUnreadCount: asyncHandler(async (req: Request, res: Response) => {
    const count = await messageService.getUnreadCount((req as any).user!.id);
    res.json({
      success: true,
      message: "Lấy số lượng tin nhắn chưa đọc thành công.",
      data: { unreadCount: count },
    });
  }),
};