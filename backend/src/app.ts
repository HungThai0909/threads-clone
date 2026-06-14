import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { Server } from "socket.io"; 
import indexRouter from "./routes/index";
import { errorHandler } from "./middlewares/error.middleware";
import { initSocket } from "./utils/socket";
import { redisClient } from "./utils/redis";
import { NotFoundError } from "./utils/errors";
import { prisma } from "./utils/prisma";

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 4000;
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const io = initSocket(httpServer);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { io: Server }).io = io; 
  next();
});

app.use("/uploads", express.static(uploadDir));
app.use("/", indexRouter);

app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError("Đường dẫn API không tồn tại"));
});

app.use(errorHandler);

const gracefulShutdown = async (signal: string) => {
  console.log(`\n Received ${signal}. Shutting down...`);
  io.close();
  httpServer.close(async () => {
    await prisma.$disconnect();
   
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
};

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));

const startServer = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log("Đã kết nối cơ sở dữ liệu Redis thành công.");
    }
    
    httpServer.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Cổng ${PORT} đã bị chiếm. Hãy kiểm tra lại các tiến trình đang chạy.`);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Lỗi trong quá trình khởi động Server hoặc Redis:", error);
  }
};

void startServer();