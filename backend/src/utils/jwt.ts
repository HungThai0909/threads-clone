import * as jwt from "jsonwebtoken";
import { JwtPayload, SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

export interface TokenPayload extends JwtPayload {
  userId: number;
  jti: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRED = process.env.JWT_EXPIRED || "1h";
const JWT_REFRESH_EXPIRED = process.env.JWT_REFRESH_EXPIRED || "7d";

export const jwtService = {
  createAccessToken(userId: number): string {
    return jwt.sign({ userId, jti: uuidv4() }, JWT_SECRET, {
      expiresIn: JWT_EXPIRED,
    } as SignOptions);
  },

  createRefreshToken(userId: number): string {
    return jwt.sign({ userId, jti: uuidv4() }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRED,
    } as SignOptions);
  },

  verifyAccessToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded as TokenPayload; 
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, expired: true, error: 'Token đã hết hạn' };
      }
      return { valid: false, expired: false, error: 'Token không hợp lệ' };
    }
  },

  verifyRefreshToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (!decoded || typeof decoded === "string") {
      throw new jwt.JsonWebTokenError("Mã làm mới không hợp lệ.");
    }
    return decoded as TokenPayload;
  },

  decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error: any) {
      return null;
    }
  },

  getSecondsUntilExpiry(token: string): number {
    const d = this.decode(token);
    if (!d?.exp) return 0;
    return Math.max(0, Math.floor(d.exp - Date.now() / 1000));
  },
};