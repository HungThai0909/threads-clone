import { Request, Response } from "express";
import { postService, CreatePostInput } from "../services/post.service";
import { asyncHandler } from "../utils/asyncHandler";
import { prisma } from "../utils/prisma";
import { NotFoundError } from "../utils/errors";
import fs from "fs/promises";
import path from "path";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const cleanupUploadedFiles = async (files: Express.Multer.File[]) => {
  try {
    for (const f of files) {
      const filePath = path.join(process.cwd(), "uploads", f.filename);
      if (await fileExists(filePath)) {
        await fs.unlink(filePath).catch(console.error);
      }
    }
  } catch (err) {
    console.error("Lỗi khi dọn dẹp file rác:", err);
  }
};

const parseQueryInt = (val: unknown, fallback: number): number => {
  if (typeof val === "string") return Number(val) || fallback;
  return fallback;
};

const buildCreatePostPayload = (
  req: Request,
  imageUrls: string[],
): CreatePostInput => {
  const authenticatedUserId = Number((req as any).user?.id);

  if (!authenticatedUserId || isNaN(authenticatedUserId)) {
    throw new Error("Người dùng chưa được xác thực hoặc mã ID không hợp lệ.");
  }

  const payload: CreatePostInput = {
    userId: authenticatedUserId,
    imageUrls: imageUrls,
    quotePostId: null,
    parentId: null,
  };

  if (typeof req.body.content === "string" && req.body.content.trim() !== "") {
    payload.content = req.body.content.trim();
  }

  if (
    req.body.visibility === "public" ||
    req.body.visibility === "followers" ||
    req.body.visibility === "private"
  ) {
    payload.visibility = req.body.visibility;
  }

  if (
    req.body.quotePostId !== undefined &&
    req.body.quotePostId !== null &&
    req.body.quotePostId !== "" &&
    req.body.quotePostId !== "undefined" &&
    req.body.quotePostId !== "null"
  ) {
    payload.quotePostId = Number(req.body.quotePostId);
  }

  if (
    req.body.parentId !== undefined &&
    req.body.parentId !== null &&
    req.body.parentId !== "" &&
    req.body.parentId !== "undefined" &&
    req.body.parentId !== "null"
  ) {
    payload.parentId = Number(req.body.parentId);
  }

  return payload;
};

export const postController = {
  createPost: asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrls = files.map((f) => `/uploads/${f.filename}`);

    if (
      (!req.body.content || req.body.content.trim() === "") &&
      imageUrls.length === 0
    ) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({
        success: false,
        message: "Bài viết phải có nội dung hoặc hình ảnh.",
      });
    }

    try {
      const payload = buildCreatePostPayload(req, imageUrls);
      const data = await postService.createPost(payload);
      res
        .status(201)
        .json({ success: true, message: "Tạo bài viết thành công.", data });
    } catch (error) {
      await cleanupUploadedFiles(files);
      throw error;
    }
  }),

  getFeed: asyncHandler(async (req: Request, res: Response) => {
    const page = parseQueryInt(req.query.page, 1);
    const limit = parseQueryInt(req.query.limit, 20);
    const data = await postService.getFeed((req as any).user?.id, page, limit);
    res.json({ success: true, data });
  }),

  getPost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    if (isNaN(postId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã bài viết không hợp lệ." });
    }

    const data = await postService.getPostDetail(postId, (req as any).user?.id);
    res.json({ success: true, data });
  }),

  updatePost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    const content =
      typeof req.body.content === "string" ? req.body.content.trim() : "";

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Nội dung cập nhật không được để trống.",
      });
    }

    const data = await postService.updatePost(
      postId,
      (req as any).user!.id,
      content,
    );
    res.json({ success: true, message: "Cập nhật bài viết thành công.", data });
  }),

  deletePost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);

    await postService.deletePost(postId, (req as any).user!.id);
    res.json({ success: true, message: "Xóa bài viết thành công." });
  }),

  getUserPosts: asyncHandler(async (req: Request, res: Response) => {
    const targetUserId = Number(req.params.userId);
    if (isNaN(targetUserId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã người dùng không hợp lệ." });
    }

    const page = parseQueryInt(req.query.page, 1);
    const limit = parseQueryInt(req.query.limit, 20);

    const userExists = await prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundError("Người dùng");

    try {
      const data = await postService.getUserPosts(
        targetUserId,
        (req as any).user?.id,
        page,
        limit,
      );
      res.json({ success: true, data });
    } catch (error) {
      if (error instanceof NotFoundError || (error as any).status === 404) {
        return res.json({ success: true, data: [] });
      }
      throw error;
    }
  }),

  likePost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);

    await postService.likePost(postId, (req as any).user!.id);
    res.json({ success: true, message: "Thích bài viết thành công." });
  }),

  getLikedPosts: asyncHandler(async (req: Request, res: Response) => {
    const targetUserId = Number(req.params.userId);
    if (isNaN(targetUserId)) {
      return res
        .status(400)
        .json({ success: false, message: "Mã người dùng không hợp lệ." });
    }

    const page = parseQueryInt(req.query.page, 1);
    const limit = parseQueryInt(req.query.limit, 20);

    const userExists = await prisma.user.findUnique({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });
    if (!userExists) throw new NotFoundError("Người dùng");

    try {
      const data = await postService.getLikedPosts(
        targetUserId,
        (req as any).user?.id,
        page,
        limit,
      );
      res.json({ success: true, data });
    } catch (error) {
      console.warn("Lưu ý: Tầng service báo trống danh sách thích:", error);
      res.json({ success: true, data: [] });
    }
  }),

  unlikePost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);

    await postService.unlikePost(postId, (req as any).user!.id);
    res.json({ success: true, message: "Bỏ thích bài viết thành công." });
  }),

  replyPost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrls = files.map((f) => `/uploads/${f.filename}`);

    if (
      (!req.body.content || req.body.content.trim() === "") &&
      imageUrls.length === 0
    ) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({
        success: false,
        message: "Nội dung phản hồi không được để trống.",
      });
    }

    try {
      const payload = buildCreatePostPayload(req, imageUrls);
      const data = await postService.replyPost(postId, payload);
      res.status(201).json({
        success: true,
        message: "Phản hồi bài viết thành công.",
        data,
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      throw error;
    }
  }),

  quotePost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    const files = (req.files as Express.Multer.File[]) || [];
    const imageUrls = files.map((f) => `/uploads/${f.filename}`);

    if (
      (!req.body.content || req.body.content.trim() === "") &&
      imageUrls.length === 0
    ) {
      await cleanupUploadedFiles(files);
      return res.status(400).json({
        success: false,
        message: "Nội dung trích dẫn không được để trống.",
      });
    }

    try {
      const payload = buildCreatePostPayload(req, imageUrls);
      const data = await postService.quotePost(postId, payload);
      res.status(201).json({
        success: true,
        message: "Trích dẫn bài viết thành công.",
        data,
      });
    } catch (error) {
      await cleanupUploadedFiles(files);
      throw error;
    }
  }),

  repost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);

    await postService.repost(postId, (req as any).user!.id);
    res.json({ success: true, message: "Chia sẻ bài viết thành công." });
  }),

  removeRepost: asyncHandler(async (req: Request, res: Response) => {
    const postId = Number(req.params.postId);
    await postService.removeRepost(postId, (req as any).user!.id);
    res.json({ success: true, message: "Hủy chia sẻ bài viết thành công." });
  }),
};
