import { Router } from "express";
import { commentController } from "../controllers/comment.controller";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createCommentSchema,
  updateCommentSchema,
  createReplySchema,
  updateReplySchema,
} from "../validators/comment.validator";

const router = Router();

router
  .route("/:postId/comments")
  .get(optionalAuthMiddleware, commentController.getComments)
  .post(
    authMiddleware,
    validate(createCommentSchema, "body"),
    commentController.createComment,
  );

router
  .route("/:postId/comments/:commentId")
  .patch(
    authMiddleware,
    validate(updateCommentSchema, "body"),
    commentController.updateComment,
  )
  .delete(authMiddleware, commentController.deleteComment);

router
  .route("/:postId/comments/:commentId/like")
  .post(authMiddleware, commentController.likeComment)
  .delete(authMiddleware, commentController.unlikeComment);

router
  .route("/:postId/comments/:commentId/replies")
  .get(optionalAuthMiddleware, commentController.getReplies)
  .post(
    authMiddleware,
    validate(createReplySchema, "body"),
    commentController.createReply,
  );

router
  .route("/:postId/comments/:commentId/replies/:replyId")
  .patch(
    authMiddleware,
    validate(updateReplySchema, "body"),
    commentController.updateReply,
  )
  .delete(authMiddleware, commentController.deleteReply);

router
  .route("/:postId/comments/:commentId/replies/:replyId/like")
  .post(authMiddleware, commentController.likeReply)
  .delete(authMiddleware, commentController.unlikeReply);

export default router;
