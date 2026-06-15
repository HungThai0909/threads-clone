# ============================================================
# Stage 1: Builder
# Cài dependencies và biên dịch TypeScript sang JavaScript
# ============================================================
FROM node:22-alpine AS builder

# Cập nhật và cài đặt các gói hệ thống cần thiết (openssl cho Prisma)
RUN apk update && apk upgrade --no-cache && apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./
COPY tsconfig.json ./

# [BỔ SUNG QUAN TRỌNG]: Copy file cấu hình ESLint vào Docker để lệnh lint không bị gãy
COPY eslint.config.js ./

# Cài đặt TẤT CẢ dependencies (bao gồm devDependencies cho build và lint)
RUN npm ci

# Copy TOÀN BỘ source code vào trước (bao gồm cả src/models)
COPY src ./src

# Khởi tạo Prisma Client từ cấu hình nhiều file schema nằm trong src/models
RUN npx prisma generate --schema=./src/models/

# Biên dịch TypeScript sang JavaScript (Lệnh này giờ sẽ chạy mượt cả lint lẫn tsc)
RUN npm run build


# ============================================================
# Stage 2: Production
# Chỉ giữ những gì cần thiết để chạy, bỏ devDependencies
# ============================================================
FROM node:22-alpine AS production

RUN apk update && apk upgrade --no-cache && apk add --no-cache openssl libc6-compat

# Tạo user không phải root để chạy app (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Chỉ cài production dependencies nhằm tối ưu dung lượng và bảo mật
RUN npm ci --only=production && npm cache clean --force

# Copy cấu trúc thư mục models và generated client từ builder
COPY --from=builder /app/src/models ./src/models
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy code đã được biên dịch (thư mục dist)
COPY --from=builder /app/dist ./dist

# Copy mail templates (EJS files)
COPY src/mail ./dist/mail

# Tạo thư mục uploads và phân quyền cho non-root user
RUN mkdir -p uploads && chown -R nodeuser:nodejs /app

# Chuyển sang user không phải root để chạy ứng dụng an toàn
USER nodeuser

# Thông báo port lắng nghe
EXPOSE 4000

# Chạy server
CMD ["node", "dist/app.js"]