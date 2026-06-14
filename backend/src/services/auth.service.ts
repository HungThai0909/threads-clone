import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../utils/prisma";
import { redisClient } from "../utils/redis";
import { jwtService } from "../utils/jwt";
import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import path from "path";
import ejs from "ejs";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/errors";
import { RegisterInput } from "../validators/auth.validator";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465");
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass)
    throw new Error("Thiếu cấu hình SMTP_USERNAME / SMTP_PASSWORD");
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: pass.replace(/\s/g, "") },
  });
}

async function sendTemplateEmail(
  to: string,
  subject: string,
  templateName: string,
  context: Record<string, unknown>,
) {
  const templatePath = path.join(
    __dirname,
    "..",
    "mail",
    "templates",
    `${templateName}.ejs`,
  );
  const html = (await ejs.renderFile(templatePath, context)) as string;
  const fromName = process.env.SMTP_FROM_NAME || "Threads";
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME;
  await getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
  console.log(`[Mail] Gửi thành công → ${to}`);
}

async function saveRefreshToken(
  userId: number,
  accessToken: string,
  refreshToken: string,
) {
  const rp = jwtService.decode(refreshToken);
  const ap = jwtService.decode(accessToken);
  const ttl = jwtService.getSecondsUntilExpiry(refreshToken);
  if (rp?.jti && ap?.jti && ttl > 0) {
    await redisClient.setEx(
      `refreshToken:${userId}:${rp.jti}`,
      ttl,
      JSON.stringify({ accessJti: ap.jti, userId }),
    );
  }
}

export const authService = {
  async register(input: RegisterInput) {
    const { email, username, password, fullname } = input;

    const [byEmail, byUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.user.findUnique({ where: { username }, select: { id: true } }),
    ]);
    if (byEmail)
      throw new BadRequestError("Địa chỉ Email này đã được đăng ký sử dụng.");
    if (byUsername)
      throw new BadRequestError("Tên tài khoản (username) này đã tồn tại.");

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        fullname,
        isEmailVerified: false,
        isVerified: false,
      },
    });

    await prisma.emailVerification.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    const verifyUrl = `${CLIENT_URL}/verify-email?token=${verificationToken}`;
    sendTemplateEmail(
      user.email,
      "Xác thực tài khoản - Threads",
      "verify-email",
      {
        username: user.username,
        verifyUrl,
      },
    ).catch((e) => console.error("[Mail] Lỗi gửi mail xác thực:", e));

    const { password: _, ...safe } = user;
    return safe;
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new BadRequestError("Email hoặc mật khẩu không chính xác.");
    if (!user.password)
      throw new BadRequestError("Tài khoản này sử dụng đăng nhập Google.");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new BadRequestError("Email hoặc mật khẩu không chính xác.");
    if (!user.isEmailVerified)
      throw new BadRequestError("Tài khoản chưa được kích hoạt Email.");

    const accessToken = jwtService.createAccessToken(user.id);
    const refreshToken = jwtService.createRefreshToken(user.id);
    await saveRefreshToken(user.id, accessToken, refreshToken);

    const { password: _, ...safe } = user;
    return { user: safe, accessToken, refreshToken };
  },

  async loginWithGoogle(input: {
    providerUserId: string;
    email: string;
    fullname: string;
    avatarUrl?: string | null;
  }) {
    const { providerUserId, email, fullname, avatarUrl } = input;

    const oauthAccount = await prisma.oAuthAccount
      .findUnique({
        where: {
          provider_providerUserId: { provider: "google", providerUserId },
        },
        include: { user: true },
      })
      .catch(() => null);

    let user: any = oauthAccount?.user || null;

    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        const base = (email.split("@")[0] ?? "user").replace(
          /[^a-zA-Z0-9_]/g,
          "",
        );
        let username = base;
        for (let i = 0; i < 5; i++) {
          const exists = await prisma.user.findUnique({
            where: { username },
            select: { id: true },
          });
          if (!exists) break;
          username = `${base}_${crypto.randomBytes(2).toString("hex")}`;
        }

        user = await prisma.user.create({
          data: {
            email,
            username,
            password: null,
            fullname,
            avatarUrl: avatarUrl ?? null,
            isEmailVerified: true,
            isVerified: true,
          },
        });
      }

      await prisma.oAuthAccount
        .upsert({
          where: {
            provider_providerUserId: { provider: "google", providerUserId },
          },
          update: {},
          create: {
            userId: user.id,
            provider: "google",
            providerUserId,
            providerEmail: email,
          },
        })
        .catch(() => null);
    }

    if (!user)
      throw new BadRequestError("Không thể xác thực người dùng Google.");

    const accessToken = jwtService.createAccessToken(user.id);
    const refreshToken = jwtService.createRefreshToken(user.id);
    await saveRefreshToken(user.id, accessToken, refreshToken);

    const { password: _, ...safe } = user;
    return { user: safe, accessToken, refreshToken };
  },

  async logout(token: string, tokenJti: string) {
    const ttl = jwtService.getSecondsUntilExpiry(token);
    if (ttl > 0) await redisClient.setEx(`blacklist:${tokenJti}`, ttl, "1");
    return true;
  },

  async refreshToken(incomingToken: string) {
    let payload: any;
    try {
      payload = jwtService.verifyRefreshToken(incomingToken);
    } catch {
      throw new UnauthorizedError("Phiên đăng nhập không hợp lệ.");
    }

    if (!payload?.userId)
      throw new UnauthorizedError("Phiên đăng nhập không hợp lệ.");

    const stored = await redisClient.get(
      `refreshToken:${payload.userId}:${payload.jti}`,
    );
    if (!stored) throw new UnauthorizedError("Phiên làm việc đã hết hạn.");

    await redisClient.del(`refreshToken:${payload.userId}:${payload.jti}`);

    const newAccessToken = jwtService.createAccessToken(payload.userId);
    const newRefreshToken = jwtService.createRefreshToken(payload.userId);
    await saveRefreshToken(payload.userId, newAccessToken, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        fullname: true,
        avatarUrl: true,
        isVerified: true,
        isEmailVerified: true,
        bio: true,
        coverUrl: true,
        createdAt: true,
        _count: { select: { followers: true, following: true, posts: true } },
      },
    });
    if (!user) throw new NotFoundError("Người dùng không tồn tại.");
    return user;
  },

  async verifyEmail(token: string) {
    const record = await prisma.emailVerification.findFirst({
      where: { token },
      include: { user: true },
    });
    if (!record || !record.user)
      throw new BadRequestError("Mã xác thực không hợp lệ.");

    if (new Date() > record.expiresAt) {
      await prisma.emailVerification.delete({ where: { id: record.id } });
      throw new BadRequestError("Mã xác thực đã hết hạn.");
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: { isEmailVerified: true, isVerified: true },
    });
    await prisma.emailVerification.delete({ where: { id: record.id } });
    return true;
  },

  async resendVerificationEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundError("Địa chỉ email không tồn tại.");
    if (user.isEmailVerified)
      throw new BadRequestError("Tài khoản này đã được xác thực.");

    await prisma.emailVerification.deleteMany({ where: { userId: user.id } });
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerification.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    const verifyUrl = `${CLIENT_URL}/verify-email?token=${token}`;
    await sendTemplateEmail(
      user.email,
      "Gửi lại mã xác thực - Threads",
      "verify-email",
      {
        username: user.username,
        verifyUrl,
      },
    );
    return true;
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true },
    });
    if (!user) return true;

    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    const resetUrl = `${CLIENT_URL}/reset-password?token=${token}`;
    sendTemplateEmail(
      user.email,
      "Khôi phục mật khẩu - Threads",
      "forgot-password",
      {
        username: user.username,
        resetUrl,
      },
    ).catch(console.error);

    return true;
  },

  async verifyResetToken(token: string) {
    const record = await prisma.passwordReset.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record || !record.user)
      throw new BadRequestError("Mã khôi phục không hợp lệ.");
    return { email: record.user.email };
  },

  async resetPassword(token: string, password: string) {
    const record = await prisma.passwordReset.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new BadRequestError("Mã khôi phục không hợp lệ.");

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    });
    await prisma.passwordReset.delete({ where: { id: record.id } });
    return true;
  },

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("Tài khoản không tồn tại.");
    if (!user.password)
      throw new BadRequestError("Tài khoản chưa thiết lập mật khẩu.");

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new BadRequestError("Mật khẩu hiện tại không chính xác.");

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    return true;
  },
};