import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  googleLoginSchema,
  resendVerificationSchema,
} from "../validators/auth.validator";

const router = Router();

router.post(
  "/register",
  validate(registerSchema, "body"),
  authController.register,
);
router.post("/login", validate(loginSchema, "body"), authController.login);
router.post(
  "/google",
  validate(googleLoginSchema, "body"),
  authController.loginWithGoogle,
);
router.post("/refresh-token", authController.refreshToken);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema, "body"),
  authController.forgotPassword,
);
router.get("/verify-reset", authController.verifyResetToken);
router.post(
  "/reset-password",
  validate(resetPasswordSchema, "body"),
  authController.resetPassword,
);

router.get("/verify-email", authController.verifyEmail);
router.post(
  "/resend-verification",
  validate(resendVerificationSchema, "body"),
  authController.resendVerificationEmail,
);

// ==========================================
// Các Routes bắt buộc phải ĐĂNG NHẬP ở dưới này
// ==========================================
router.use(authMiddleware);

router.get("/me", authController.getMe);
router.delete("/logout", authController.logout);
router.patch(
  "/change-password",
  validate(changePasswordSchema, "body"),
  authController.changePassword,
);

export default router;