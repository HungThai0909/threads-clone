import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  idParamSchema,
  paginationQuerySchema,
} from "../validators/param.validator";

const router = Router();

router.get(
  "/users",
  optionalAuthMiddleware,
  validate(paginationQuerySchema, "query"),
  searchController.searchUsers,
);

router.get(
  "/posts",
  optionalAuthMiddleware,
  validate(paginationQuerySchema, "query"),
  searchController.searchPosts,
);

router
  .route("/history")
  .get(authMiddleware, searchController.getSearchHistory)
  .delete(authMiddleware, searchController.clearAllSearchHistory);

router.post(
  "/history/:targetId",
  authMiddleware,
  validate(idParamSchema, "params"),
  searchController.saveSearchHistory,
);

router.delete(
  "/history/:id",
  authMiddleware,
  validate(idParamSchema, "params"),
  searchController.deleteSearchHistoryItem,
);

export default router;
