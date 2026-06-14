import { Router } from "express";
import { postController } from "../controllers/post.controller";
import { commentController } from "../controllers/comment.controller";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { upload } from "../middlewares/upload.middleware";
import {
  createPostSchema,
  updatePostSchema,
  replyPostSchema,
  quotePostSchema,
} from "../validators/post.validator";
import { paginationQuerySchema } from "../validators/param.validator";

const router = Router();

router.get("/feed", optionalAuthMiddleware, postController.getFeed);

router.get(
  "/user/:userId/liked",
  optionalAuthMiddleware,
  validate(paginationQuerySchema, "query"),
  postController.getLikedPosts,
);

router.get(
  "/user/:userId",
  optionalAuthMiddleware,
  validate(paginationQuerySchema, "query"),
  postController.getUserPosts,
);

router.get("/:postId", optionalAuthMiddleware, postController.getPost);
router.get(
  "/:postId/comments",
  optionalAuthMiddleware,
  commentController.getComments,
);

router.use(authMiddleware);

router.post(
  "/",
  upload.array("images", 4),
  validate(createPostSchema, "body"),
  postController.createPost,
);

router.patch(
  "/:postId",
  validate(updatePostSchema, "body"),
  postController.updatePost,
);

router.delete("/:postId", postController.deletePost);
router.post("/:postId/like", postController.likePost);
router.delete("/:postId/like", postController.unlikePost);

router.post(
  "/:postId/reply",
  upload.array("images", 4),
  validate(replyPostSchema, "body"),
  postController.replyPost,
);

router.post(
  "/:postId/quote",
  upload.array("images", 4),
  validate(quotePostSchema, "body"),
  postController.quotePost,
);

router.post("/:postId/repost", postController.repost);
router.delete("/:postId/repost", postController.removeRepost);

export default router;
