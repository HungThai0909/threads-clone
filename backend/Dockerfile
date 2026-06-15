# ============================================================
# Stage 1: Builder
# Cài dependencies và biên dịch TypeScript sang JavaScript
# ============================================================
FROM node:20-alpine AS builder

# Cài đặt các gói hệ thống cần thiết (openssl cho Prisma)
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
# Chỉ khi package.json thay đổi mới cần chạy lại npm install
COPY package*.json ./
COPY tsconfig.json ./

# Cài đặt TẤT CẢ dependencies (bao gồm devDependencies cho build)
RUN npm ci

# Copy Prisma schema để generate client
COPY prisma ./prisma/

# Generate Prisma Client (phải chạy sau khi copy schema)
RUN npx prisma generate

# Copy toàn bộ source code
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

# Chỉ cài production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy Prisma schema và generated client từ builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy code đã được build
COPY --from=builder /app/dist ./dist

# Copy mail templates (EJS files - không được biên dịch, cần copy riêng)
# Cấu trúc sau build: dist/mail/templates/*.ejs
COPY src/mail ./dist/mail

# Tạo thư mục uploads và phân quyền
RUN mkdir -p uploads && chown -R nodeuser:nodejs /app

# Chuyển sang user không phải root
USER nodeuser

# Expose port (chỉ là documentation, không thực sự publish)
EXPOSE 4000

# Health check: gọi endpoint /health mỗi 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Chạy migration rồi start server
# Dùng sh -c để chạy nhiều lệnh
CMD ["node", "dist/app.js"]