# ============================================================
# Stage 1: Builder
# Cài dependencies và biên dịch TypeScript sang JavaScript
# ============================================================
FROM node:20-alpine AS builder

# Cài đặt các gói hệ thống cần thiết (openssl cho Prisma)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package*.json ./
COPY tsconfig.json ./

# Cài đặt TẤT CẢ dependencies (bao gồm devDependencies cho build)
RUN npm ci

# Copy toàn bộ thư mục chứa các file prisma nhỏ (.prisma) vào Docker trước
COPY src/models ./src/models/

# [QUAN TRỌNG] Khởi tạo Prisma Client từ cấu hình nhiều file schema
# Phiên bản Prisma mới hỗ trợ đọc thư mục schema bằng cờ --schema
RUN npx prisma generate --schema=./src/models/

# Copy toàn bộ source code còn lại
COPY src ./src

# Biên dịch TypeScript sang JavaScript
RUN npm run build


# ============================================================
# Stage 2: Production
# Chỉ giữ những gì cần thiết để chạy, bỏ devDependencies
# => Image nhỏ hơn, bảo mật hơn
# ============================================================
FROM node:20-alpine AS production

RUN apk add --no-cache openssl libc6-compat

# Tạo user không phải root để chạy app (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# Chỉ cài production dependencies nhằm tối ưu dung lượng image
RUN npm ci --only=production && npm cache clean --force

# Copy cấu trúc thư mục models (chứa các file schema) và generated client từ builder
COPY --from=builder /app/src/models ./src/models
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy code đã được biên dịch (thư mục dist)
COPY --from=builder /app/dist ./dist

# Copy mail templates (EJS files - không được TS biên dịch nên cần copy riêng)
COPY src/mail ./dist/mail

# Tạo thư mục uploads và phân quyền cho non-root user
RUN mkdir -p uploads && chown -R nodeuser:nodejs /app

# Chuyển sang user không phải root để chạy ứng dụng an toàn
USER nodeuser

# Thông báo port lắng nghe (môi trường Render sẽ đè port này bằng biến môi trường $PORT)
EXPOSE 4000

# Chạy server
CMD ["node", "dist/app.js"]