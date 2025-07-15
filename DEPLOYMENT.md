# 🚀 部署指南

## 快速部署到 Vercel

### 方法一：一鍵部署
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ai-proxy)

### 方法二：手動部署

#### 1. 準備工作
```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入 Vercel
vercel login
```

#### 2. 專案設定
```bash
# 進入專案目錄
cd ai-proxy

# 初始化 Vercel 專案
vercel

# 按照提示設定專案
# - Set up and deploy? Y
# - Which scope? (選擇你的帳戶)
# - Link to existing project? N
# - What's your project's name? ai-proxy
# - In which directory is your code located? ./
```

#### 3. 環境變數設定
在 Vercel 儀表板中設定以下環境變數：

**必要變數：**
```
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
TENANT_UUID=2595af81-c151-47eb-9f15-d17e0adbe3b4
LOGIN_PATH=/wise/wiseadm/s/subadmin
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**安全設定：**
```
MAX_MESSAGE_LENGTH=10000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
SESSION_TIMEOUT=1800000
```

**應用程式設定：**
```
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

#### 4. 部署
```bash
# 部署到生產環境
vercel --prod
```

## GitHub 設定

### 1. 建立 GitHub Repository
```bash
# 初始化 Git
git init

# 新增所有文件
git add .

# 建立初始提交
git commit -m "Initial commit: AI Chat Multi-Service Platform"

# 新增遠端倉庫
git remote add origin https://github.com/yourusername/ai-proxy.git

# 推送到 GitHub
git push -u origin main
```

### 2. 自動部署設定
在 Vercel 儀表板中：
1. 進入專案設定
2. 選擇 "Git Integration"
3. 連接 GitHub 倉庫
4. 啟用自動部署

## 安全設定檢查清單

### ✅ 必要檢查項目
- [ ] 所有敏感資料都設定為環境變數
- [ ] `.env.local` 文件已被 `.gitignore` 排除
- [ ] 生產環境的 `ENCRYPTION_KEY` 已設定
- [ ] HTTPS 已啟用
- [ ] 安全標頭已設定

### ✅ 建議檢查項目
- [ ] 定期更新依賴套件
- [ ] 監控 API 使用量
- [ ] 設定錯誤監控
- [ ] 建立備份策略

## 生產環境最佳實踐

### 1. 環境變數管理
```bash
# 生產環境必須設定的變數
NODE_ENV=production
ENCRYPTION_KEY=your-secure-32-character-key-here
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 2. 監控設定
```bash
# 可選的監控設定
LOG_LEVEL=info
ENABLE_SECURITY_LOGGING=true
CSP_REPORT_URI=https://your-csp-report-endpoint.com/report
```

### 3. 效能優化
- 啟用 Vercel 的邊緣功能
- 使用 CDN 加速靜態資源
- 設定適當的快取策略

## 故障排除

### 常見問題

#### CSP (Content Security Policy) 錯誤
如果遇到 "Refused to execute inline script" 錯誤：

**解決方案**：
- 開發環境會自動允許 inline scripts
- 生產環境使用更嚴格的 CSP 設定
- 確保 `NODE_ENV` 環境變數設定正確

**驗證方法**：
```bash
# 檢查環境變數
echo $NODE_ENV

# 開發環境
NODE_ENV=development npm run dev

# 生產環境
NODE_ENV=production npm run build
```

### 常見問題

#### 1. 部署失敗
```bash
# 檢查建置錯誤
vercel logs

# 本地測試建置
npm run build
```

#### 2. 環境變數問題
```bash
# 檢查環境變數
vercel env ls

# 新增環境變數
vercel env add VARIABLE_NAME
```

#### 3. API 端點問題
```bash
# 檢查 API 路由
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### 除錯指令
```bash
# 查看即時日誌
vercel logs --follow

# 查看函數日誌
vercel logs --function=src/app/api/chat/route.ts

# 本地開發除錯
npm run dev
```

## 更新部署

### 自動更新（推薦）
```bash
# 推送到主分支會自動觸發部署
git push origin main
```

### 手動更新
```bash
# 手動部署
vercel --prod

# 指定別名
vercel --prod --alias your-custom-domain.com
```

## 安全維護

### 定期檢查
- 每月檢查依賴套件更新
- 監控 API 使用量異常
- 檢查錯誤日誌
- 更新環境變數的密鑰

### 備份策略
- 定期備份 API Key 設定
- 建立災難恢復計劃
- 監控服務可用性

## 支援與幫助

### 文件資源
- [Vercel 文件](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [專案說明文件](./README.md)

### 常見連結
- [Vercel 儀表板](https://vercel.com/dashboard)
- [GitHub 倉庫設定](https://github.com/yourusername/ai-proxy/settings)
- [專案監控](https://vercel.com/yourusername/ai-proxy/analytics)

---

🎉 **完成部署後，您的 AI 聊天平台就可以在 `https://your-domain.vercel.app` 上使用了！**