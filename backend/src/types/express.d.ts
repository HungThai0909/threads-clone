import { Server } from "socket.io";

declare global {
  namespace Express {
    interface Request {
      io: Server;
      token?: string;
      tokenJti?: string;
      user?: {
        id: number;
        username: string;
        email: string;
        fullname: string;
        avatarUrl: string | null;
        isVerified: boolean;
        isEmailVerified: boolean;
      };
    }
  }
}

export {};
