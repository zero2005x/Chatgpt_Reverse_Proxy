# 多階段 Dockerfile 用於最佳化建置和部署

# 基礎映像
FROM node:18-alpine AS base
WORKDIR /app

# 安裝相依套件
FROM base AS deps
# 檢查 package.json 和 package-lock.json
COPY package.json package-lock.json* ./
RUN \
    if [ -f package-lock.json ]; then npm ci --only=production; \
    else echo "Lockfile not found." && exit 1; \
    fi

# 建置階段
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# 建立環境變數檔案（如果需要）
ENV NEXT_TELEMETRY_DISABLED 1

# 建置應用程式
RUN npm run build

# 開發階段
FROM base AS development
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED 1

EXPOSE 3000

CMD ["npm", "run", "dev"]

# 生產階段
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製相依套件
COPY --from=deps /app/node_modules ./node_modules

# 複製建置結果
COPY --from=builder /app/public ./public

# 自動利用輸出追蹤來減少映像大小
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切換到非 root 使用者
USER nextjs

# 暴露連接埠
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# 啟動應用程式
CMD ["node", "server.js"]
