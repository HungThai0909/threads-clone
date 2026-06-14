import { Router } from "express";
import { userController } from "../controllers/user.controller";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { updateProfileSchema } from "../validators/user.validator";
import { paginationQuerySchema } from "../validators/param.validator";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.get("/profile", authMiddleware, userController.getMyProfile);
router.get(
  "/suggested",
  authMiddleware,
  validate(paginationQuerySchema, "query"),
  userController.getSuggested,
);
router.patch(
  "/profile",
  authMiddleware,
  validate(updateProfileSchema, "body"),
  userController.updateProfile,
);
router.delete("/profile/picture", authMiddleware, userController.deleteAvatar);

router.patch(
  "/profile/avatar",
  authMiddleware,
  upload.single("avatar"),
  userController.uploadAvatar,
);
router.patch(
  "/profile/cover",
  authMiddleware,
  upload.single("cover"),
  userController.uploadCover,
);

router.get("/:id", optionalAuthMiddleware, userController.getProfile);

router.get(
  "/follow/:userId/followers",
  optionalAuthMiddleware,
  validate(paginationQuerySchema, "query"),
  userController.getFollowers,
);
router.get(
  "/follow/:userId/following",
  optionalAuthMiddleware,
  validate(paginationQuerySchema, "query"),
  userController.getFollowing,
);
router.post("/follow/:userId/follow", authMiddleware, userController.follow);
router.delete(
  "/follow/:userId/follow",
  authMiddleware,
  userController.unfollow,
);
router.post("/:userId/block", authMiddleware, userController.block);
router.delete("/:userId/block", authMiddleware, userController.unblock);

export default router;
