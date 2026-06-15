# 🧵 Threads Clone — Fullstack Social Media App

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
  <img src="https://img.shields.io/badge/Node.js-20-green?logo=node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue?logo=postgresql" />
  <img src="https://img.shields.io/badge/Redis-7-red?logo=redis" />
  <img src="https://img.shields.io/badge/Docker-ready-blue?logo=docker" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma" />
  <img src="https://img.shields.io/badge/Socket.io-realtime-black?logo=socket.io" />
</p>

> Dự án clone ứng dụng **Threads (Meta)** được xây dựng fullstack với mục tiêu học tập, portfolio và ứng tuyển thực tập. Được thiết kế theo kiến trúc thực tế, áp dụng các best practice của industry.

---

## 📋 Mục lục

- [Tổng quan dự án](#-tổng-quan-dự-án)
- [Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [Tính năng](#-tính-năng)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Cài đặt & Chạy dự án](#-cài-đặt--chạy-dự-án)
- [Biến môi trường](#-biến-môi-trường)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [WebSocket Events](#-websocket-events)
- [Bảo mật](#-bảo-mật)
- [Roadmap](#-roadmap)

---

## 🎯 Tổng quan dự án

**Threads Clone** là một ứng dụng mạng xã hội dạng microblogging, lấy cảm hứng từ Threads của Meta. Người dùng có thể đăng bài, tương tác, nhắn tin và theo dõi nhau trong thời gian thực.

### Điểm nổi bật kỹ thuật

| Điểm mạnh | Mô tả |
|---|---|
| **Clean Architecture** | Tách biệt rõ ràng: Controller → Service → Repository (Prisma) |
| **Type-safe 100%** | TypeScript end-to-end, từ API đến database |
| **Real-time** | Socket.IO cho notifications, messages, online presence |
| **Auth an toàn** | JWT + Refresh Token + Redis blacklist + bcrypt |
| **Validation chặt chẽ** | Zod schema validation trên cả input và output |
| **Docker ready** | Multi-stage build, docker-compose đầy đủ |
| **Error handling** | Centralized error handler, custom error classes |
| **Caching** | Redis cache cho user session, token blacklist |

---

## 🛠 Công nghệ sử dụng

### Backend
| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Express.js | 4.x | HTTP Framework |
| TypeScript | 5.x | Type safety |
| Prisma | 5.x | ORM + Migration |
| PostgreSQL | 16 | Primary database |
| Redis | 7 | Cache, token blacklist, session |
| Socket.IO | 4.x | Real-time communication |
| JWT | - | Authentication |
| Zod | 3.x | Schema validation |
| Multer | - | File upload |
| Nodemailer + EJS | - | Email templates |
| bcrypt | - | Password hashing |
| Helmet | - | HTTP security headers |

### Frontend
| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| Next.js | 15 (App Router) | React Framework |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Styling |
| shadcn/ui | - | UI Components |
| TanStack Query | 5.x | Server state management |
| Zustand | 4.x | Global client state |
| Socket.IO Client | 4.x | Real-time |
| Axios | - | HTTP Client |

### DevOps & Tools
| Công nghệ | Mục đích |
|---|---|
| Docker + Docker Compose | Containerization |
| ESLint + Prettier | Code quality |
| Git | Version control |

---

## ✨ Tính năng

### 🔐 Authentication & Authorization
- [x] **Đăng ký tài khoản** — Validation đầy đủ (username, email, password strength)
- [x] **Xác thực email** — Gửi link xác thực qua Gmail SMTP
- [x] **Đăng nhập** — Email + password, trả về JWT access & refresh token
- [x] **Đăng nhập Google** — OAuth với provider user ID
- [x] **Refresh Token** — Tự động gia hạn phiên, rotate token sau mỗi lần dùng
- [x] **Đăng xuất** — Blacklist access token trên Redis
- [x] **Quên mật khẩu** — Gửi email reset link, token hết hạn sau 1 giờ
- [x] **Đặt lại mật khẩu** — Verify token, cập nhật password mới
- [x] **Đổi mật khẩu** — Xác thực mật khẩu cũ trước khi đổi
- [x] **Auto revoke** — Hủy toàn bộ token khi đổi/reset mật khẩu
- [x] **Rate limit email** — Throttle 60 giây giữa các lần gửi mail

### 👤 User Profile
- [x] **Xem hồ sơ** — Public profile với stats (posts, followers, following)
- [x] **Chỉnh sửa hồ sơ** — fullname, bio, username
- [x] **Upload avatar** — Hỗ trợ JPEG/PNG/WebP/GIF, tối đa 5MB
- [x] **Upload ảnh bìa** — Cover photo cho profile
- [x] **Xóa avatar** — Xóa file vật lý trên server
- [x] **Gợi ý kết bạn** — Đề xuất người dùng chưa follow, ưu tiên verified & nhiều follower
- [x] **Danh sách followers** — Phân trang
- [x] **Danh sách following** — Phân trang

### 🤝 Social Interactions
- [x] **Follow / Unfollow** — Theo dõi người dùng, gửi notification real-time
- [x] **Block / Unblock** — Chặn user, tự động hủy follow 2 chiều
- [x] **Block protection** — Ẩn content, profile của người bị block
- [x] **Visibility control** — Nội dung chỉ hiện đúng đối tượng (public/followers/blocked)

### 📝 Posts (Bài viết)
- [x] **Tạo bài viết** — Text + tối đa 4 ảnh, hỗ trợ visibility (public/followers/private)
- [x] **Feed** — Timeline công khai, lọc block
- [x] **Chi tiết bài viết** — Kèm comments preview
- [x] **Cập nhật bài viết** — Chỉ chủ sở hữu
- [x] **Xóa bài viết** — Soft delete, cập nhật hashtag count
- [x] **Like / Unlike** — Thích bài viết
- [x] **Repost** — Chia sẻ bài viết người khác (không trùng lặp)
- [x] **Reply** — Phản hồi dạng thread, lồng bài viết
- [x] **Quote Post** — Trích dẫn bài viết kèm nội dung mới
- [x] **Hashtag tự động** — Parse `#hashtag` từ content, tạo/update hashtag record
- [x] **Bài viết theo user** — Lấy tất cả bài của một người dùng
- [x] **Image upload** — Tối đa 4 ảnh/bài, auto cleanup khi lỗi

### 💬 Comments (Bình luận)
- [x] **Tạo comment** — Comment vào bài viết
- [x] **Danh sách comment** — Cursor-based pagination, kèm 3 reply preview
- [x] **Cập nhật comment** — Chỉ chủ sở hữu
- [x] **Xóa comment** — Soft delete, decrement comment count
- [x] **Like / Unlike comment** — Thích bình luận
- [x] **Reply comment** — Trả lời bình luận
- [x] **Cập nhật / Xóa reply** — Soft delete reply
- [x] **Like / Unlike reply** — Thích câu trả lời
- [x] **Notification on comment** — Thông báo cho chủ bài khi có comment/reply mới

### 🔔 Notifications (Thông báo)
- [x] **Danh sách thông báo** — Phân trang, kèm thông tin sender và post
- [x] **Đánh dấu đã đọc** — Đánh dấu 1 thông báo
- [x] **Đánh dấu tất cả đã đọc** — Bulk update
- [x] **Unread badge** — Đếm số thông báo chưa đọc
- [x] **Real-time push** — Socket.IO emit khi có notification mới
- [x] **Badge update real-time** — Cập nhật số badge ngay khi đọc

### 💌 Messages (Tin nhắn)
- [x] **Tạo / Lấy cuộc hội thoại** — 1-1 hoặc nhóm, idempotent với MD5 hash
- [x] **Danh sách cuộc hội thoại** — Kèm tin nhắn cuối, sắp xếp theo mới nhất
- [x] **Lịch sử tin nhắn** — Cursor-based pagination, 30 tin/lần
- [x] **Gửi tin nhắn** — Text + 1 ảnh, hỗ trợ reply-to
- [x] **Reply tin nhắn** — Trích dẫn tin nhắn gốc
- [x] **Đánh dấu đã đọc** — Single message hoặc bulk khi mở chat
- [x] **Unread count** — Tổng tin nhắn chưa đọc
- [x] **Real-time messaging** — Socket.IO emit ngay khi gửi
- [x] **Block protection** — Không cho nhắn tin khi bị block
- [x] **Nhóm chat** — Tạo group với tên, nhiều thành viên

### #️⃣ Hashtags
- [x] **Tạo hashtag** — Normalize tên (lowercase, bỏ #)
- [x] **Tìm kiếm hashtag** — Full-text search
- [x] **Trending hashtags** — Top hashtag nhiều bài nhất
- [x] **Bài viết theo hashtag** — Lọc theo visibility + block

### 🔍 Search (Tìm kiếm)
- [x] **Tìm kiếm người dùng** — Theo username, fullname, email, bài viết
- [x] **Tìm kiếm bài viết** — Full-text, lọc visibility + block
- [x] **Lịch sử tìm kiếm** — Lưu user đã xem
- [x] **Xóa lịch sử** — Xóa từng mục hoặc tất cả
- [x] **Block filter** — Ẩn kết quả từ người bị block

### 🌐 Real-time (Socket.IO)
- [x] **Online presence** — Track user online/offline, last seen
- [x] **Room join/leave** — Join conversation room khi mở chat
- [x] **message:new** — Tin nhắn mới trong conversation
- [x] **message:seen** — Đánh dấu tin nhắn đã xem
- [x] **message:seen_all** — Đánh dấu toàn bộ đã xem
- [x] **conversation:update** — Cập nhật danh sách conversation
- [x] **notification:new** — Thông báo mới
- [x] **notification:badge_update** — Cập nhật số badge thông báo
- [x] **user:online / user:offline** — Trạng thái online

---

## 🏗 Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────┐
│                   CLIENT (Next.js)               │
│  App Router │ React Query │ Zustand │ Socket.IO  │
└─────────────────────┬───────────────────────────┘
                      │ HTTP / WebSocket
┌─────────────────────▼───────────────────────────┐
│              BACKEND (Express.js)                │
│                                                  │
│  Routes → Middlewares → Controllers → Services   │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Auth MW │  │Validate  │  │ Error Handler│  │
│  │  (JWT)   │  │  (Zod)   │  │ (Centralized)│  │
│  └──────────┘  └──────────┘  └──────────────┘  │
└────────┬──────────────────────────┬─────────────┘
         │                          │
┌────────▼──────┐          ┌────────▼──────┐
│  PostgreSQL   │          │     Redis     │
│   (Prisma)    │          │  (Cache/BL)   │
└───────────────┘          └───────────────┘
```

**Luồng request điển hình:**
```
Request → Route → Auth Middleware → Validate Middleware
       → Controller → Service → Prisma → PostgreSQL
       → Response (JSON)
```

---

## 📁 Cấu trúc thư mục

```
threads-clone/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Xử lý request/response
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── post.controller.ts
│   │   │   ├── comment.controller.ts
│   │   │   ├── message.controller.ts
│   │   │   ├── notification.controller.ts
│   │   │   ├── hashtag.controller.ts
│   │   │   └── search.controller.ts
│   │   ├── services/          # Business logic
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── post.service.ts
│   │   │   ├── comment.service.ts
│   │   │   ├── message.service.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── hashtag.service.ts
│   │   │   └── search.service.ts
│   │   ├── routes/            # Định nghĩa endpoints
│   │   │   ├── index.ts
│   │   │   ├── auth.route.ts
│   │   │   ├── user.route.ts
│   │   │   ├── post.route.ts
│   │   │   ├── comment.route.ts
│   │   │   ├── message.route.ts
│   │   │   ├── notification.route.ts
│   │   │   ├── hashtag.route.ts
│   │   │   └── search.route.ts
│   │   ├── middlewares/       # Auth, validate, upload, error
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validate.middleware.ts
│   │   │   ├── upload.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── validators/        # Zod schemas
│   │   │   ├── auth.validator.ts
│   │   │   ├── user.validator.ts
│   │   │   ├── post.validator.ts
│   │   │   ├── comment.validator.ts
│   │   │   ├── message.validator.ts
│   │   │   ├── hashtag.validator.ts
│   │   │   └── param.validator.ts
│   │   ├── utils/             # Helpers & configs
│   │   │   ├── asyncHandler.ts
│   │   │   ├── errors.ts
│   │   │   ├── hashing.ts
│   │   │   ├── jwt.ts
│   │   │   ├── mail.ts
│   │   │   ├── prisma.ts
│   │   │   ├── redis.ts
│   │   │   └── socket.ts
│   │   ├── mail/
│   │   │   └── templates/     # EJS email templates
│   │   │       ├── verify-email.ejs
│   │   │       └── forgot-password.ejs
│   │   ├── generated/         # Prisma generated client
│   │   └── app.ts             # Entry point
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # Migration files
│   ├── uploads/               # Uploaded files (gitignored)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .dockerignore
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── app/               # Next.js App Router
    │   │   ├── (auth)/        # Auth pages (login, register...)
    │   │   ├── (main)/        # Main layout pages
    │   │   │   ├── feed/
    │   │   │   ├── profile/
    │   │   │   ├── messages/
    │   │   │   └── search/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── components/        # Reusable UI components
    │   │   ├── ui/            # shadcn/ui base components
    │   │   ├── post/
    │   │   ├── user/
    │   │   ├── message/
    │   │   └── shared/
    │   ├── services/          # API call functions
    │   │   ├── auth.service.ts
    │   │   ├── post.service.ts
    │   │   └── ...
    │   ├── stores/            # Zustand stores
    │   │   ├── auth.store.ts
    │   │   └── socket.store.ts
    │   ├── types/             # TypeScript interfaces
    │   ├── lib/               # Utils (axios instance, etc.)
    │   ├── actions/           # Next.js Server Actions
    │   └── constants/         # App constants
    └── package.json
```

---

## 🚀 Cài đặt & Chạy dự án

### Yêu cầu hệ thống
- Node.js >= 20
- Docker & Docker Compose
- Git

### Option 1: Chạy với Docker Compose (Khuyến nghị)

```bash
# 1. Clone repository
git clone https://github.com/your-username/threads-clone.git
cd threads-clone/backend

# 2. Tạo file .env từ template
cp .env.example .env
# Chỉnh sửa .env với thông tin của bạn

# 3. Build và chạy tất cả services
docker compose up --build -d

# 4. Xem logs
docker compose logs -f backend

# 5. Dừng services
docker compose down
```

### Option 2: Chạy thủ công (Development)

```bash
# 1. Clone và cài dependencies
git clone https://github.com/your-username/threads-clone.git
cd threads-clone/backend
npm install

# 2. Cấu hình môi trường
cp .env.example .env
# Chỉnh sửa DATABASE_URL, REDIS_URL, JWT secrets...

# 3. Chạy PostgreSQL và Redis (Docker)
docker run -d --name postgres -e POSTGRES_PASSWORD=123456 -p 5432:5432 postgres:16-alpine
docker run -d --name redis -p 6380:6379 redis:7-alpine

# 4. Generate Prisma client
npx prisma generate

# 5. Chạy migration
npx prisma migrate dev

# 6. Start dev server
npm run dev
```

### Kiểm tra hệ thống

```bash
# Health check
curl http://localhost:4000/health

# Test đăng ký
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test1234","fullname":"Test User"}'
```

---

## 🔑 Biến môi trường

Tạo file `.env` từ `.env.example`:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DB_NAME?schema=public"

# Redis
REDIS_URL="redis://localhost:6380"
REDIS_PASSWORD="your_redis_password"  # Nếu dùng auth

# JWT — BẮT BUỘC thay đổi trong production
JWT_SECRET="your_super_secret_jwt_key_min_32_chars"
JWT_EXPIRED="1h"
JWT_REFRESH_SECRET="your_super_secret_refresh_key_min_32_chars"
JWT_REFRESH_EXPIRED="7d"

# App
PORT=4000
NODE_ENV=development
CLIENT_URL="http://localhost:3000"

# Email (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USERNAME="your_email@gmail.com"
SMTP_PASSWORD="your_gmail_app_password"  # App Password, không phải mật khẩu thường
SMTP_FROM_NAME="Threads Clone"
SMTP_FROM_EMAIL="your_email@gmail.com"

# Docker Compose
POSTGRES_USER=f8
POSTGRES_PASSWORD=123456
POSTGRES_DB=db_auth
```

> ⚠️ **Lưu ý bảo mật:** Không bao giờ commit file `.env` thật lên Git. JWT secrets phải dài ít nhất 32 ký tự ngẫu nhiên.

---

## 📡 API Documentation

Base URL: `http://localhost:4000`

### Authentication

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/auth/register` | ❌ | Đăng ký tài khoản |
| POST | `/auth/login` | ❌ | Đăng nhập |
| POST | `/auth/google` | ❌ | Đăng nhập Google |
| POST | `/auth/refresh-token` | ❌ | Gia hạn access token |
| GET | `/auth/verify-email/:token` | ❌ | Xác thực email |
| POST | `/auth/resend-verification` | ❌ | Gửi lại email xác thực |
| POST | `/auth/forgot-password` | ❌ | Quên mật khẩu |
| GET | `/auth/verify-reset` | ❌ | Verify reset token |
| POST | `/auth/reset-password` | ❌ | Đặt lại mật khẩu |
| GET | `/auth/me` | ✅ | Thông tin tài khoản hiện tại |
| DELETE | `/auth/logout` | ✅ | Đăng xuất |
| PATCH | `/auth/change-password` | ✅ | Đổi mật khẩu |

### Users

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/users/profile` | ✅ | Hồ sơ của tôi |
| PATCH | `/users/profile` | ✅ | Cập nhật hồ sơ |
| PATCH | `/users/profile/avatar` | ✅ | Upload avatar |
| DELETE | `/users/profile/picture` | ✅ | Xóa avatar |
| PATCH | `/users/profile/cover` | ✅ | Upload ảnh bìa |
| GET | `/users/:id` | ⭕ | Xem hồ sơ người dùng |
| GET | `/users/suggested` | ✅ | Gợi ý kết bạn |
| POST | `/users/follow/:userId/follow` | ✅ | Follow user |
| DELETE | `/users/follow/:userId/follow` | ✅ | Unfollow user |
| GET | `/users/follow/:userId/followers` | ⭕ | Danh sách followers |
| GET | `/users/follow/:userId/following` | ⭕ | Danh sách following |
| POST | `/users/:userId/block` | ✅ | Block user |
| DELETE | `/users/:userId/block` | ✅ | Unblock user |

### Posts

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/posts/feed` | ⭕ | Timeline |
| POST | `/posts` | ✅ | Tạo bài viết (multipart) |
| GET | `/posts/:postId` | ⭕ | Chi tiết bài viết |
| PATCH | `/posts/:postId` | ✅ | Cập nhật bài viết |
| DELETE | `/posts/:postId` | ✅ | Xóa bài viết |
| GET | `/posts/user/:userId` | ⭕ | Bài viết của user |
| POST | `/posts/:postId/like` | ✅ | Like bài viết |
| DELETE | `/posts/:postId/like` | ✅ | Unlike bài viết |
| POST | `/posts/:postId/reply` | ✅ | Reply bài viết |
| POST | `/posts/:postId/quote` | ✅ | Quote bài viết |
| POST | `/posts/:postId/repost` | ✅ | Repost |
| DELETE | `/posts/:postId/repost` | ✅ | Hủy repost |

### Comments

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/comments/:postId/comments` | ⭕ | Danh sách comments |
| POST | `/comments/:postId/comments` | ✅ | Tạo comment |
| PATCH | `/comments/:postId/comments/:commentId` | ✅ | Sửa comment |
| DELETE | `/comments/:postId/comments/:commentId` | ✅ | Xóa comment |
| POST | `/comments/:postId/comments/:commentId/like` | ✅ | Like comment |
| DELETE | `/comments/:postId/comments/:commentId/like` | ✅ | Unlike comment |
| GET | `/comments/:postId/comments/:commentId/replies` | ⭕ | Danh sách replies |
| POST | `/comments/:postId/comments/:commentId/replies` | ✅ | Tạo reply |
| POST | `/comments/:postId/comments/:commentId/replies/:replyId/like` | ✅ | Like reply |

### Messages

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/messages/conversations` | ✅ | Danh sách conversations |
| POST | `/messages/conversations` | ✅ | Tạo/lấy conversation |
| GET | `/messages/conversations/:conversationId/messages` | ✅ | Lịch sử tin nhắn |
| POST | `/messages/messages` | ✅ | Gửi tin nhắn |
| PUT | `/messages/messages/:messageId/read` | ✅ | Đánh dấu đã đọc |
| GET | `/messages/unread-count` | ✅ | Số tin chưa đọc |

### Notifications

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/notifications` | ✅ | Danh sách thông báo |
| PATCH | `/notifications` | ✅ | Đánh dấu tất cả đã đọc |
| PATCH | `/notifications/:id` | ✅ | Đánh dấu 1 thông báo đã đọc |

### Hashtags & Search

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET | `/hashtags/trending` | ❌ | Trending hashtags |
| GET | `/hashtags/search?q=` | ❌ | Tìm hashtag |
| GET | `/hashtags/:name/posts` | ⭕ | Bài viết theo hashtag |
| POST | `/hashtags` | ✅ | Tạo hashtag |
| GET | `/search/users?q=` | ⭕ | Tìm kiếm người dùng |
| GET | `/search/posts?q=` | ⭕ | Tìm kiếm bài viết |
| GET | `/search/history` | ✅ | Lịch sử tìm kiếm |
| POST | `/search/history/:targetId` | ✅ | Lưu lịch sử |
| DELETE | `/search/history` | ✅ | Xóa tất cả lịch sử |
| DELETE | `/search/history/:id` | ✅ | Xóa 1 mục lịch sử |

> **Chú thích:** ✅ = Bắt buộc đăng nhập | ⭕ = Optional auth | ❌ = Không cần auth

---

## 🗄 Database Schema

```
User ──< Post ──< PostComment ──< CommentReply
  │         │          │
  │         └──< PostLike    └──< CommentLike
  │         └──< PostHashtag       └──< ReplyLike
  │         └──< PostImage
  │
  ├──< Follow (self-referential)
  ├──< UserBlock
  ├──< Notification
  ├──< SearchHistory
  ├──< EmailVerification
  ├──< PasswordReset
  ├──< OAuthAccount
  ├──< UserPresence
  │
  └──< ConversationMember ──< Conversation ──< Message
                                                  └──< MessageRead
```

---

## 🔌 WebSocket Events

### Client → Server

| Event | Payload | Mô tả |
|-------|---------|-------|
| `conversation:join` | `{ conversationId }` | Join room chat |
| `conversation:leave` | `{ conversationId }` | Leave room chat |

### Server → Client

| Event | Payload | Mô tả |
|-------|---------|-------|
| `message:new` | Message object | Tin nhắn mới |
| `message:seen` | `{ messageId, userId, readAt }` | Ai đó đã xem tin nhắn |
| `message:seen_all` | `{ conversationId, userId, readAt }` | Xem toàn bộ tin nhắn |
| `conversation:update` | `{ conversationId, lastMessage }` | Cập nhật conversation list |
| `notification:new` | Notification object | Thông báo mới (follow, like, comment) |
| `notification:badge_update` | `{ unreadCount }` | Cập nhật số badge |
| `user:online` | `{ userId }` | User vừa online |
| `user:offline` | `{ userId, lastSeenAt }` | User vừa offline |

**Kết nối Socket với JWT:**
```javascript
const socket = io("http://localhost:4000", {
  auth: { token: "your_access_token" }
});
```

---

## 🔒 Bảo mật

Dự án áp dụng nhiều lớp bảo mật:

| Lớp | Cơ chế |
|-----|--------|
| **Password** | bcrypt với salt rounds = 10 |
| **Token** | JWT short-lived (1h) + Refresh Token (7d) |
| **Blacklist** | Redis lưu JTI của token đã logout |
| **Rate limit** | 60s throttle cho email actions |
| **HTTP Headers** | Helmet.js (CSP, HSTS, XSS protection...) |
| **Input validation** | Zod schema trên toàn bộ endpoint |
| **File upload** | Whitelist MIME types, giới hạn 5MB |
| **Block system** | Ẩn content, ngăn follow/message |
| **Non-root Docker** | Container chạy với user ID 1001 |
| **CORS** | Chỉ cho phép CLIENT_URL |

---

