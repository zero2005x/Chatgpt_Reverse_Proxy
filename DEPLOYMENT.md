# 🚀 部署指南

全面的 AI Chat Multi-Service Platform 部署指南，涵蓋多種部署方式和環境配置。

## 📋 部署前準備

### 系統需求

- **Node.js** 18.17+ (推薦 LTS 版本)
- **npm** 9.0+ 或 **yarn** 1.22+
- **Git** 2.0+
- **現代瀏覽器支援** (Chrome 100+, Firefox 100+, Safari 15+, Edge 100+)

### 環境檢查

```bash
# 檢查 Node.js 版本
node --version  # 應該 >= 18.17.0

# 檢查 npm 版本
npm --version   # 應該 >= 9.0.0

# 檢查 Git 版本
git --version   # 應該 >= 2.0.0
```

## 🌐 Vercel 部署 (推薦)

### 一鍵部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zero2005x/Chatgpt_Reverse_Proxy)

### 手動部署步驟

#### 1. 準備工作

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入 Vercel 帳號
vercel login
```

#### 2. 複製與設定專案

```bash
# 複製專案
git clone https://github.com/zero2005x/Chatgpt_Reverse_Proxy.git
cd Chatgpt_Reverse_Proxy

# 安裝相依套件
npm install

# 初始化 Vercel 專案
vercel
```

#### 3. 環境變數設定

在 Vercel Dashboard 或透過 CLI 設定：

```bash
# 使用 CLI 設定環境變數
vercel env add AI_BASE_URL
vercel env add TENANT_UUID
vercel env add LOGIN_PATH
vercel env add MAX_MESSAGE_LENGTH
vercel env add MAX_FILE_SIZE
vercel env add RATE_LIMIT_WINDOW
vercel env add RATE_LIMIT_MAX_REQUESTS
vercel env add SESSION_TIMEOUT
```

**必要環境變數**

```env
# Portal 服務配置
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
TENANT_UUID=2595af81-c151-47eb-9f15-d17e0adbe3b4
LOGIN_PATH=/wise/wiseadm/s/subadmin

# 安全與限制設定
MAX_MESSAGE_LENGTH=10000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
SESSION_TIMEOUT=1800000

# 應用程式設定
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="AI Chat Platform"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

#### 4. 部署到生產環境

```bash
# 部署到生產環境
vercel --prod

# 查看部署狀態
vercel ls

# 查看部署日誌
vercel logs
```

#### 5. 自定義域名設定 (可選)

```bash
# 新增自定義域名
vercel domains add your-domain.com

# 設定域名別名
vercel alias your-deployment-url.vercel.app your-domain.com
```

### Vercel 進階配置

#### vercel.json 設定

```json
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

## 🐳 Docker 部署

### Dockerfile

```dockerfile
# 基礎映像
FROM node:18-alpine AS base
WORKDIR /app

# 安裝相依套件階段
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# 建置階段
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生產階段
FROM base AS runner
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製建置結果
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 設定使用者
USER nextjs

# 暴露連接埠
EXPOSE 3000

# 設定環境變數
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 啟動應用程式
CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: "3.8"

services:
  ai-chat-platform:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
      - TENANT_UUID=2595af81-c151-47eb-9f15-d17e0adbe3b4
      - LOGIN_PATH=/wise/wiseadm/s/subadmin
      - MAX_MESSAGE_LENGTH=10000
      - MAX_FILE_SIZE=5242880
      - RATE_LIMIT_WINDOW=60000
      - RATE_LIMIT_MAX_REQUESTS=10
      - SESSION_TIMEOUT=1800000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # 可選：使用 Nginx 作為反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - ai-chat-platform
    restart: unless-stopped
```

### 建置與執行

```bash
# 建置 Docker 映像
docker build -t ai-chat-platform .

# 執行容器
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com \
  -e TENANT_UUID=2595af81-c151-47eb-9f15-d17e0adbe3b4 \
  ai-chat-platform

# 使用 Docker Compose
docker-compose up -d

# 查看日誌
docker-compose logs -f ai-chat-platform

# 停止服務
docker-compose down
```

## ☁️ 雲端平台部署

### AWS (Amazon Web Services)

#### AWS Amplify

```bash
# 安裝 Amplify CLI
npm install -g @aws-amplify/cli

# 配置 Amplify
amplify configure

# 初始化專案
amplify init

# 新增託管
amplify add hosting

# 部署
amplify publish
```

#### AWS ECS (Elastic Container Service)

```bash
# 建置並推送到 ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

docker build -t ai-chat-platform .
docker tag ai-chat-platform:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-chat-platform:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/ai-chat-platform:latest

# 建立 ECS 任務定義和服務
aws ecs create-cluster --cluster-name ai-chat-cluster
```

### Google Cloud Platform

#### Cloud Run

```bash
# 建置並部署到 Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/ai-chat-platform
gcloud run deploy --image gcr.io/PROJECT_ID/ai-chat-platform --platform managed
```

#### App Engine

```yaml
# app.yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  AI_BASE_URL: https://dgb01p240102.japaneast.cloudapp.azure.com
  TENANT_UUID: 2595af81-c151-47eb-9f15-d17e0adbe3b4

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

```bash
# 部署到 App Engine
gcloud app deploy
```

### Microsoft Azure

#### Azure App Service

```bash
# 登入 Azure
az login

# 建立資源群組
az group create --name ai-chat-rg --location "East US"

# 建立 App Service 計劃
az appservice plan create --name ai-chat-plan --resource-group ai-chat-rg --sku B1 --is-linux

# 建立 Web App
az webapp create --resource-group ai-chat-rg --plan ai-chat-plan --name ai-chat-platform --runtime "NODE|18-lts"

# 設定環境變數
az webapp config appsettings set --resource-group ai-chat-rg --name ai-chat-platform --settings NODE_ENV=production

# 部署程式碼
az webapp deployment source config --resource-group ai-chat-rg --name ai-chat-platform --repo-url https://github.com/zero2005x/Chatgpt_Reverse_Proxy --branch main
```

## 🖥️ 自架伺服器部署

### Ubuntu/Debian

#### 1. 系統準備

```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安裝 PM2
sudo npm install -g pm2

# 安裝 Nginx
sudo apt install nginx -y

# 安裝 SSL 憑證工具
sudo apt install certbot python3-certbot-nginx -y
```

#### 2. 應用程式部署

```bash
# 複製程式碼
git clone https://github.com/zero2005x/Chatgpt_Reverse_Proxy.git
cd Chatgpt_Reverse_Proxy

# 安裝相依套件
npm ci --only=production

# 建置應用程式
npm run build

# 建立環境變數檔案
cat > .env.production << EOF
NODE_ENV=production
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
TENANT_UUID=2595af81-c151-47eb-9f15-d17e0adbe3b4
LOGIN_PATH=/wise/wiseadm/s/subadmin
MAX_MESSAGE_LENGTH=10000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
SESSION_TIMEOUT=1800000
EOF

# 使用 PM2 啟動
pm2 start npm --name "ai-chat" -- start
pm2 save
pm2 startup
```

#### 3. Nginx 設定

```nginx
# /etc/nginx/sites-available/ai-chat-platform
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 啟用網站
sudo ln -s /etc/nginx/sites-available/ai-chat-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 設定 SSL 憑證
sudo certbot --nginx -d your-domain.com
```

### CentOS/RHEL

#### 1. 系統準備

```bash
# 更新系統
sudo yum update -y

# 安裝 Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安裝 PM2
sudo npm install -g pm2

# 安裝 Nginx
sudo yum install nginx -y

# 啟動並啟用 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 2. 防火牆設定

```bash
# 開放 HTTP/HTTPS 連接埠
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🔧 進階配置

### 效能調校

#### PM2 叢集模式

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "ai-chat-platform",
      script: "npm",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

```bash
# 使用叢集模式啟動
pm2 start ecosystem.config.js --env production
```

#### Nginx 效能調校

```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 1024;

http {
    # Gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # 快取設定
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m max_size=1g inactive=60m use_temp_path=off;

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        # SSL 安全設定
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # 安全標頭
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location / {
            proxy_pass http://localhost:3000;
            proxy_cache app_cache;
            proxy_cache_bypass $http_upgrade;
            proxy_cache_valid 200 302 10m;
            proxy_cache_valid 404 1m;

            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # 靜態資源快取
        location /_next/static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 監控與日誌

#### 應用程式監控

```bash
# PM2 監控
pm2 monitor

# 查看即時日誌
pm2 logs ai-chat

# 查看應用程式狀態
pm2 status

# 重啟應用程式
pm2 restart ai-chat

# 查看 CPU 和記憶體使用情況
pm2 monit
```

#### 系統監控

```bash
# 安裝系統監控工具
sudo apt install htop iotop nethogs -y

# 查看系統資源使用情況
htop

# 查看磁碟 I/O
iotop

# 查看網路使用情況
nethogs
```

### 備份與還原

#### 資料備份

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/var/backups/ai-chat"
APP_DIR="/path/to/ai-chat-platform"
DATE=$(date +%Y%m%d_%H%M%S)

# 建立備份目錄
mkdir -p $BACKUP_DIR

# 備份應用程式檔案
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR .

# 備份環境變數
cp $APP_DIR/.env.production $BACKUP_DIR/env_$DATE

# 清理舊備份（保留最近 7 天）
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
```

```bash
# 設定定期備份
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

## 🚦 健康檢查與監控

### 健康檢查端點

建立健康檢查 API：

```typescript
// src/app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
    env: process.env.NODE_ENV || "development",
    services: {
      portal: {
        baseUrl: process.env.AI_BASE_URL ? "configured" : "not configured",
        tenantUuid: process.env.TENANT_UUID ? "configured" : "not configured",
      },
    },
  };

  return NextResponse.json(health, { status: 200 });
}
```

```typescript
// src/app/api/health-enhanced/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Enhanced health check with comprehensive system monitoring
  // Includes AI service connectivity, performance metrics, and diagnostics
}
```

測試健康檢查：

```bash
# 基本健康檢查
curl http://localhost:3000/api/health

# 增強型健康檢查
curl "http://localhost:3000/api/health-enhanced?extensive=true"

# Docker 容器健康檢查
curl http://localhost:3000/api/health || exit 1
```

### 外部監控服務

```bash
# Uptime Robot
curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=YOUR_API_KEY&format=json&type=1&url=https://your-domain.com/api/health&friendly_name=AI Chat Platform"

# Pingdom
# 透過 Pingdom 網站設定 HTTP 監控
```

## 🔒 安全性檢查清單

### 部署前檢查

- [ ] 所有敏感資訊都設定為環境變數
- [ ] 啟用 HTTPS 和適當的 SSL 憑證
- [ ] 設定適當的 CORS 政策
- [ ] 啟用 Rate Limiting
- [ ] 設定安全標頭
- [ ] 更新所有相依套件到最新版本
- [ ] 設定適當的檔案權限
- [ ] 停用不必要的服務和連接埠

### 運行時監控

- [ ] 定期檢查系統更新
- [ ] 監控應用程式日誌
- [ ] 檢查異常流量和錯誤率
- [ ] 定期備份重要資料
- [ ] 監控 SSL 憑證過期時間

## 📞 故障排除

### 常見問題

#### 1. 應用程式無法啟動

```bash
# 檢查 Node.js 版本
node --version

# 檢查相依套件
npm ls

# 重新安裝相依套件
rm -rf node_modules package-lock.json
npm install

# 檢查環境變數
env | grep NODE_ENV
```

#### 2. API 回應緩慢

```bash
# 檢查系統資源
top
free -h
df -h

# 檢查應用程式效能
pm2 monit

# 檢查網路連線
ping google.com
```

#### 3. SSL 憑證問題

```bash
# 檢查憑證狀態
sudo certbot certificates

# 更新憑證
sudo certbot renew

# 測試 SSL 設定
openssl s_client -connect your-domain.com:443
```

### 日誌分析

```bash
# 查看 Nginx 存取日誌
sudo tail -f /var/log/nginx/access.log

# 查看 Nginx 錯誤日誌
sudo tail -f /var/log/nginx/error.log

# 查看應用程式日誌
pm2 logs ai-chat --lines 100

# 查看系統日誌
sudo journalctl -u nginx -f
```

## 📈 擴展性考量

### 水平擴展

- 使用負載平衡器分散流量
- 實施 CDN 加速靜態資源
- 考慮微服務架構
- 使用快取層減少資料庫負載

### 垂直擴展

- 增加 CPU 和記憶體資源
- 使用 SSD 儲存加速 I/O
- 調整 PM2 執行緒數量
- 優化 Nginx 配置

---

如需更多協助，請參考：

- [GitHub Issues](https://github.com/zero2005x/Chatgpt_Reverse_Proxy/issues)
- [API 文檔](./API.md)
- [使用說明](./README.md)
