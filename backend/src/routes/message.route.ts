import { Router } from "express";
import { messageController } from "../controllers/message.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createConversationSchema,
  sendMessageSchema,
} from "../validators/message.validator";
import {
  conversationIdParamSchema,
  paginationQuerySchema,
} from "../validators/param.validator";

const router = Router();

router.use(authMiddleware);

router
  .route("/conversations")
  .get(messageController.getConversations)
  .post(
    validate(createConversationSchema, "body"),
    messageController.getOrCreateConversation,
  );

router.get(
  "/conversations/:conversationId/messages",
  validate(conversationIdParamSchema, "params"),
  validate(paginationQuerySchema, "query"),
  messageController.getMessages,
);

router.post(
  "/messages",
  upload.single("image"),
  validate(sendMessageSchema, "body"),
  messageController.sendMessage,
);

router.put("/messages/:messageId/read", messageController.seenMessage);

router.get("/unread-count", messageController.getUnreadCount);

export default router;
