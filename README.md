# 🤖 AI Chat Multi-Service Platform

一個整合多個 AI 服務的聊天平台，支援原始 Portal 服務和 27+ 種外部 AI 服務提供商，包含完整的聊天記錄管理和 API Key 管理功能。

![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ 功能特色

### 🔄 雙模式支援
- **原始 Portal 服務**：連接到內部 AI 系統
- **外部 AI 服務**：支援 27+ 種 AI 服務提供商

### 🧠 支援的 AI 服務
- **主流服務**：OpenAI GPT、Google Gemini、Claude、Mistral
- **專業服務**：Cohere、Groq、Perplexity、xAI (Grok)
- **雲端平台**：Azure OpenAI、AWS Bedrock、Google Vertex AI
- **開源平台**：Hugging Face、Together AI、Fireworks AI

### 💾 資料管理
- **聊天記錄**：自動儲存、匯入/匯出 (JSON, CSV)
- **API Key 管理**：安全儲存、批量匯入匯出
- **本地儲存**：所有資料儲存在瀏覽器本地

### 🔐 安全功能
- **輸入驗證**：完整的 XSS 和注入攻擊防護
- **Rate Limiting**：每分鐘 10 次請求限制
- **安全標頭**：CSP、HSTS、X-Frame-Options 等
- **API Key 保護**：客戶端加密儲存

### 📱 使用者介面
- **響應式設計**：支援桌面和行動裝置
- **即時對話**：流暢的聊天體驗
- **服務切換**：輕鬆切換不同 AI 服務
- **狀態監控**：即時顯示服務狀態

## 🚀 快速開始

### 環境需求
- Node.js 18.17+
- npm 9.0+

### 安裝步驟

1. **複製專案**
```bash
git clone https://github.com/yourusername/ai-chat-platform.git
cd ai-chat-platform
```

2. **安裝依賴**
```bash
npm install
```

3. **環境設定**
```bash
cp .env.example .env.local
# 編輯 .env.local 檔案，設定必要的環境變數
```

4. **啟動開發伺服器**
```bash
npm run dev
```

5. **開啟瀏覽器**
前往 `http://localhost:3000` 開始使用

## 🌐 部署到 Vercel

### 一鍵部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/ai-chat-platform)

### 手動部署

1. **準備 Vercel 專案**
```bash
npm i -g vercel
vercel
```

2. **環境變數設定**
在 Vercel 儀表板中設定以下環境變數：
```
AI_BASE_URL=https://your-ai-service.com
TENANT_UUID=your-tenant-uuid
LOGIN_PATH=/your/login/path
ENCRYPTION_KEY=your-32-character-encryption-key
```

3. **部署**
```bash
vercel --prod
```

## 📋 使用說明

### 基本設定

1. **訪問首頁**：檢查 Portal 服務狀態
2. **設定 API Keys**：前往 `/settings` 新增 AI 服務的 API Key
3. **開始聊天**：前往 `/chat` 選擇服務並開始對話

### Portal 服務設定

如果您要使用原始 Portal 服務：

1. 在首頁輸入用戶名和密碼
2. 點擊「檢查登入狀態」
3. 點擊「檢查存取權限」
4. 點擊「開始聊天」並選擇「原始服務」

### 外部 AI 服務設定

1. 前往 `/settings` 頁面
2. 選擇要使用的 AI 服務
3. 輸入對應的 API Key
4. 前往 `/chat` 頁面並選擇「外部服務」

### 聊天記錄管理

- **匯出**：在側邊欄點擊「匯出對話」
- **匯入**：在側邊欄點擊「匯入對話」
- **格式說明**：前往 `/docs` 查看詳細格式說明

## 🔧 API 端點

### 原始服務 API
- `POST /api/chat` - 原始 Portal 服務
- `POST /api/check-login` - 登入狀態檢查
- `POST /api/check-access` - 存取權限檢查

### 外部服務 API
- `POST /api/ai-chat` - 外部 AI 服務統一端點

## 📁 專案結構

```
src/
├── app/
│   ├── api/          # API 路由
│   ├── chat/         # 聊天頁面
│   ├── docs/         # 文檔說明
│   ├── settings/     # 設定頁面
│   └── page.tsx      # 首頁
├── components/       # React 組件
├── hooks/           # 自定義 Hooks
└── types/           # TypeScript 類型定義
```

## 🛡️ 安全性

### 已實施的安全功能
- ✅ 輸入驗證和 XSS 防護
- ✅ Rate Limiting (10 req/min)
- ✅ 安全標頭設定
- ✅ API Key 加密儲存
- ✅ 錯誤處理和日誌記錄

### 建議的安全措施
- 🔒 定期更新依賴項
- 🔒 使用 HTTPS 連接
- 🔒 定期審核 API Key
- 🔒 監控異常活動

## 📊 支援的檔案格式

### 聊天記錄
- **JSON**：完整的聊天記錄格式
- **CSV**：簡化的對話格式

### API Key 管理
- **JSON**：API Key 批量匯入匯出

詳細格式說明請參考 `/docs` 頁面。

## 🤝 貢獻

歡迎提交 Issues 和 Pull Requests！

### 開發指南

1. Fork 此專案
2. 建立功能分支: `git checkout -b feature/AmazingFeature`
3. 提交變更: `git commit -m 'Add some AmazingFeature'`
4. 推送到分支: `git push origin feature/AmazingFeature`
5. 開啟 Pull Request

## 📄 授權

本專案使用 MIT 授權 - 查看 [LICENSE](LICENSE) 檔案了解詳情

## 🚨 注意事項

- 請勿在程式碼中提交真實的 API Key
- 確保在生產環境中設定適當的環境變數
- 定期檢查依賴項的安全更新
- 遵守各 AI 服務提供商的使用條款

## 📞 支援

如有問題或建議，請：
- 開啟 [GitHub Issue](https://github.com/yourusername/ai-chat-platform/issues)
- 查看 [文檔說明](/docs)
- 檢查 [常見問題](#)

---

**免責聲明**：本專案僅供學習和研究使用。使用者需自行承擔使用第三方 AI 服務的風險和責任。