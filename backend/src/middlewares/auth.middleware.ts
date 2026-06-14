import { Request, Response, NextFunction } from "express";
import { jwtService } from "../utils/jwt";
import { redis } from "../utils/redis";
import { prisma } from "../utils/prisma";
import { UnauthorizedError } from "../utils/errors";
import { asyncHandler } from "../utils/asyncHandler";

interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  fullname: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isEmailVerified: boolean;
}

interface AuthenticatedRequest extends Request {
  token?: string;
  tokenJti?: string;
  user?: AuthenticatedUser;
}

async function processTokenAndUser(
  req: AuthenticatedRequest,
): Promise<{ success: boolean; isExpired?: boolean }> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { success: false };

  try {
    // Gọi hàm xác thực từ jwtService
    const result = jwtService.verifyAccessToken(token);

    // ĐÃ SỬA: Kiểm tra cấu trúc trả về xem token có lỗi hoặc hết hạn hay không
    if ("valid" in result) {
      if (result.expired) {
        return { success: false, isExpired: true };
      }
      return { success: false };
    }

    // Nếu không lọt vào block trên, TypeScript tự hiểu result chính là TokenPayload hợp lệ
    const payload = result;
    if (!payload || !payload.jti) return { success: false };

    const isBlacklisted = await redis.isBlacklisted(payload.jti);
    if (isBlacklisted) return { success: false };

    const cacheKey = `user:cache:${payload.userId}`;
    const cachedUser = await redis.get(cacheKey);
    let user: AuthenticatedUser | null = null;

    if (cachedUser) {
      user = JSON.parse(cachedUser) as AuthenticatedUser;
    } else {
      const dbUser = await prisma.user.findFirst({
        where: {
          id: payload.userId,
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          fullname: true,
          avatarUrl: true,
          isVerified: true,
          isEmailVerified: true,
        },
      });

      if (!dbUser) return { success: false };

      user = {
        ...dbUser,
        fullname: dbUser.fullname ?? "",
      };

      await redis.set(cacheKey, JSON.stringify(user), 300);
    }

    req.user = user;
    req.token = token;
    req.tokenJti = payload.jti;

    return { success: true };
  } catch (error: any) {
    return { success: false };
  }
}

export const authMiddleware = asyncHandler(
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const result = await processTokenAndUser(req);

    if (!result.success) {
      if (result.isExpired) {
        throw new UnauthorizedError("AccessTokenExpired");
      }
      throw new UnauthorizedError(
        "Phiên đăng nhập không hợp lệ hoặc đã bị hủy.",
      );
    }

    next();
  },
);

export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  await processTokenAndUser(req);
  next();
};