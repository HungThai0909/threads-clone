import { Router } from "express";
import authRouter from "./auth.route";
import userRouter from "./user.route";
import postRouter from "./post.route";
import commentRouter from "./comment.route";
import hashtagRouter from "./hashtag.route";
import searchRouter from "./search.route";
import notificationRouter from "./notification.route";
import messageRouter from "./message.route";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/posts", postRouter);
router.use("/comments", commentRouter);
router.use("/hashtags", hashtagRouter);
router.use("/search", searchRouter);
router.use("/notifications", notificationRouter);
router.use("/messages", messageRouter);

export default router;
