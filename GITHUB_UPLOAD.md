# 🚀 GitHub 上傳指南

## 📋 前置準備

### 1. 確認專案狀態
```bash
# 檢查專案建置
npm run build

# 檢查代碼品質
npm run lint

# 確認沒有敏感資料
git status
```

### 2. 建立 GitHub 倉庫
1. 前往 [GitHub](https://github.com)
2. 點擊「New repository」
3. 設定倉庫名稱：`ai-proxy`
4. 選擇 Public 或 Private
5. **不要** 初始化 README、.gitignore 或 LICENSE（專案已包含）

## 📤 上傳步驟

### 方法一：使用命令行（推薦）

```bash
# 1. 初始化 Git 倉庫
git init

# 2. 設定使用者資訊（如果還沒設定）
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 3. 添加所有文件
git add .

# 4. 建立初始提交
git commit -m "feat: Initial commit - AI Chat Multi-Service Platform

🤖 Core Features:
- Dual-mode support: Original Portal + 27+ external AI services
- Complete chat history management with JSON/CSV import/export
- Secure API key management with encryption
- Real-time service status monitoring
- Responsive UI with dark/light mode support

🔐 Security Improvements:
- Comprehensive input validation and XSS protection
- Rate limiting (10 req/min) and security headers
- Secure API key storage with client-side encryption
- Enhanced error handling without information disclosure

📱 User Interface:
- /chat - Multi-service chat interface with history sidebar
- /settings - API key management with import/export
- /docs - Complete data format documentation
- Homepage - Portal service status check and authentication

🛡️ Security Features:
- CSP, HSTS, X-Frame-Options security headers
- Environment variable configuration
- Comprehensive .gitignore for sensitive data
- Production-ready Vercel deployment config

🔧 API Endpoints:
- POST /api/chat - Original Portal service
- POST /api/ai-chat - External AI services
- POST /api/check-login - Authentication validation
- POST /api/check-access - Permission verification

🚀 Production Ready:
- Vercel deployment configuration
- Environment variable setup
- Security audit passed
- Build optimization for performance"

# 5. 添加遠端倉庫（替換 yourusername 為您的 GitHub 用戶名）
git remote add origin https://github.com/yourusername/ai-proxy.git

# 6. 推送到 GitHub
git push -u origin main
```

### 方法二：使用 GitHub CLI（需要先安裝 gh CLI）

```bash
# 1. 初始化並提交
git init
git add .
git commit -m "feat: Initial commit - AI Chat Multi-Service Platform"

# 2. 使用 GitHub CLI 建立倉庫並推送
gh repo create ai-proxy --public --push --source=.
```

## 🔍 驗證上傳結果

上傳完成後，檢查：

1. **檔案完整性**：確認所有檔案都已上傳
2. **README 顯示**：GitHub 頁面正確顯示 README.md
3. **分支設定**：確認 main 分支為預設分支
4. **環境變數**：確認 .env.local 和敏感資料未被上傳

## 🔒 安全檢查清單

- [ ] `.env.local` 未被上傳
- [ ] `.env` 檔案未被上傳
- [ ] 沒有硬編碼的密碼或 API key
- [ ] `.gitignore` 正確配置
- [ ] LICENSE 文件已包含
- [ ] 敏感資料已被排除

## 📊 上傳後的後續步驟

### 1. 設定 GitHub Pages（可選）
如果需要建立文檔網站：
```bash
# 建立 gh-pages 分支
git checkout -b gh-pages
git push origin gh-pages
```

### 2. 設定 Vercel 部署
1. 前往 [Vercel](https://vercel.com)
2. 連接 GitHub 倉庫
3. 設定環境變數
4. 部署專案

### 3. 設定 CI/CD
專案已包含 GitHub Actions 工作流程 (`.github/workflows/ci.yml`)，會自動：
- 在每次 push 時運行測試
- 檢查代碼品質
- 確認建置成功

### 4. 更新文檔中的 URL
上傳後，更新以下文件中的 URL：
- `README.md`
- `DEPLOYMENT.md`
- `package.json`

將 `yourusername` 替換為實際的 GitHub 用戶名。

## 🎯 範例命令（完整流程）

```bash
# 假設您的 GitHub 用戶名是 "myusername"
git init
git add .
git commit -m "feat: Initial commit - AI Chat Multi-Service Platform"
git remote add origin https://github.com/myusername/ai-proxy.git
git push -u origin main

# 確認上傳成功
git remote -v
git status
```

## 🔧 常見問題解決

### 問題 1：推送被拒絕
```bash
# 解決方案：強制推送（僅在首次上傳時使用）
git push -u origin main --force
```

### 問題 2：檔案過大
```bash
# 檢查大檔案
git ls-files --others --ignored --exclude-standard

# 移除大檔案並重新提交
git rm --cached large-file.zip
git commit -m "remove large file"
```

### 問題 3：認證失敗
```bash
# 設定 GitHub 認證
gh auth login

# 或使用 SSH
ssh-keygen -t rsa -b 4096 -C "your.email@example.com"
```

## 🎉 完成！

上傳完成後，您的專案將可以在以下位置訪問：
- **GitHub 倉庫**：`https://github.com/yourusername/ai-proxy`
- **一鍵部署**：使用 README 中的 Vercel 部署按鈕
- **本地克隆**：其他用戶可以使用 `git clone` 命令複製專案

記得更新文檔中的所有 URL 以反映實際的 GitHub 倉庫位置！