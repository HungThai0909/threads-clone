import { Router } from "express";
import { hashtagController } from "../controllers/hashtag.controller";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createHashtagSchema } from "../validators/hashtag.validator";
import {
  hashtagNameParamSchema,
  paginationQuerySchema,
} from "../validators/param.validator";

const router = Router();

router.get("/trending", hashtagController.getTrending);
router.get("/search", hashtagController.searchHashtag);

router.get(
  "/:name/posts",
  optionalAuthMiddleware,
  validate(hashtagNameParamSchema, "params"),
  validate(paginationQuerySchema, "query"),
  hashtagController.getPostsByHashtag,
);

router.use(authMiddleware);

router.post(
  "/",
  validate(createHashtagSchema, "body"),
  hashtagController.createHashtag,
);

export default router;
