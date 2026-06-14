import { Router } from "express";
import { notificationController } from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  idParamSchema,
  paginationQuerySchema,
} from "../validators/param.validator";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  validate(paginationQuerySchema, "query"),
  notificationController.getAll,
);

router.patch("/", notificationController.markAllRead);

router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  notificationController.markRead,
);

export default router;
