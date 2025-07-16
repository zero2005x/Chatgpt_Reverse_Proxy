# 🤖 AI Chat Multi-Service Platform

一個整合多個 AI 服務的聊天平台，支援原始 Portal 服務和 27+ 種外部 AI 服務提供商，包含完整的聊天記錄管理和 API Key 管理功能。

![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ 核心功能

### 🔄 雙模式 AI 服務

- **原始 Portal 服務**：連接企業內部 AI 系統，支援登入認證與 Portal 存取驗證
- **外部 AI 服務**：支援 27+ 種主流 AI 服務提供商，包含 OpenAI、Claude、Gemini 等

### 🧠 支援的 AI 服務

- **OpenAI**：GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo
- **Google**：Gemini-1.5-pro, Gemini-1.5-flash, Gemini-1.0-pro
- **Anthropic**：Claude-3.5-sonnet, Claude-3-opus, Claude-3-sonnet, Claude-3-haiku
- **Mistral**：Mistral-large-latest, Open-mixtral-8x22b, Codestral-latest
- **Cohere**：Command-r-plus, Command-r, Command-light
- **Groq**：Llama3-70b-8192, Llama3-8b-8192, Mixtral-8x7b-32768, Gemma-7b-it
- **xAI**：Grok-4 系列、Grok-3 系列、Grok-2 系列模型
- **Azure OpenAI**：GPT-4, GPT-4-turbo, GPT-35-turbo 系列
- **其他服務**：Hugging Face、Together AI、Fireworks AI、Perplexity、Anyscale 等

### 💾 智能資料管理

- **聊天會話管理**：
  - 自動儲存對話記錄到本地儲存
  - 支援多會話切換與重命名
  - 跨標籤頁同步與狀態管理
  - 自動備份與錯誤恢復機制
- **匯入匯出功能**：
  - JSON 格式完整資料匯出（包含 metadata）
  - CSV 格式對話記錄匯出
  - 支援批量匯入與資料合併
  - 重複資料自動去重
- **API Key 管理**：
  - 客戶端 XOR 加密儲存
  - 支援批量匯入匯出
  - 按服務分類管理
  - 自動驗證與狀態提示

### 🔐 企業級安全功能

- **認證系統**：
  - Portal 服務雙重認證（登入狀態 + 存取權限）
  - Session 自動延期與狀態監控
  - 安全的憑證管理
- **安全防護**：
  - 完整的 XSS 和注入攻擊防護
  - Rate Limiting（每分鐘 10 次請求）
  - 嚴格的 CSP、HSTS 安全標頭
  - API Key 客戶端加密儲存
- **輸入驗證**：
  - 訊息長度限制（最大 10,000 字元）
  - 文件大小限制（最大 5MB）
  - 惡意內容過濾

### 📱 現代化使用者體驗

- **響應式設計**：
  - 完全適配桌面、平板、手機裝置
  - 手機版側邊欄與導航優化
  - 觸控友好的互動設計
- **智能介面**：
  - 統一的導航頁首組件
  - 即時的服務狀態指示器
  - 優雅的載入動畫與狀態反饋
  - 智能通知系統（成功/錯誤/警告）
- **進階功能**：
  - 服務模式智能切換
  - 模型參數調整（溫度、最大 token）
  - 對話記錄搜尋與篩選
  - 鍵盤快捷鍵支援

### 🔧 技術特色

- **React 19 + Next.js 15.3.5**：最新前端技術棧
- **TypeScript 完整類型定義**：確保程式碼品質
- **自定義 Hooks 架構**：
  - `useChatHistory`：會話管理與持久化
  - `useApiKeys`：API Key 管理與加密
  - `usePortalAuth`：企業認證與權限管理
  - `useApiKeyImportExport`：資料匯入匯出
- **Context 狀態管理**：跨組件的狀態共享
- **本地優先架構**：所有資料儲存在瀏覽器本地

## 🚀 快速開始

### 系統需求

- **Node.js** 18.17+ (推薦使用 LTS 版本)
- **npm** 9.0+ 或 **yarn** 1.22+
- **現代瀏覽器**：Chrome 100+, Firefox 100+, Safari 15+, Edge 100+

### 安裝與設定

1. **複製專案**

```bash
git clone https://github.com/zero2005x/Chatgpt_Reverse_Proxy.git
cd Chatgpt_Reverse_Proxy
```

2. **安裝相依套件**

```bash
npm install
# 或使用 yarn
yarn install
```

3. **環境變數設定**

```bash
cp .env.example .env.local
```

編輯 `.env.local` 檔案：

```env
# Portal 服務設定
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
TENANT_UUID=2595af81-c151-47eb-9f15-d17e0adbe3b4
LOGIN_PATH=/wise/wiseadm/s/subadmin

# 安全設定
MAX_MESSAGE_LENGTH=10000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
SESSION_TIMEOUT=1800000

# Next.js 設定
NEXT_PUBLIC_APP_NAME="AI Chat Platform"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

4. **開發模式啟動**

```bash
npm run dev
# 或使用 yarn
yarn dev
```

5. **開啟瀏覽器**
   前往 `http://localhost:3000` 開始使用

### 建置與部署

**生產環境建置**

```bash
npm run build
npm start
```

**型別檢查**

```bash
npx tsc --noEmit
```

**程式碼檢查**

```bash
npm run lint
```

## 🌐 部署到 Vercel

### 一鍵部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/Chatgpt_Reverse_Proxy)

### 手動部署

1. **準備 Vercel 專案**

```bash
npm i -g vercel
vercel
```

2. **環境變數設定**
   在 Vercel 儀表板中設定以下環境變數：

````
# Portal Service Configuration
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
TENANT_UUID=your-tenant-uuid
## 🌐 部署指南

### Vercel 一鍵部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/zero2005x/Chatgpt_Reverse_Proxy)

### 手動部署到 Vercel

1. **安裝 Vercel CLI**
```bash
npm i -g vercel
````

2. **登入並初始化**

```bash
vercel login
vercel
```

3. **環境變數設定**
   在 Vercel 儀表板中設定環境變數：

```env
# Portal Service Configuration
AI_BASE_URL=https://dgb01p240102.japaneast.cloudapp.azure.com
TENANT_UUID=2595af81-c151-47eb-9f15-d17e0adbe3b4
LOGIN_PATH=/wise/wiseadm/s/subadmin

# Security Settings
MAX_MESSAGE_LENGTH=10000
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
SESSION_TIMEOUT=1800000

# Application Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

4. **部署**

```bash
vercel --prod
```

### 其他部署平台

**Netlify**

```bash
npm run build
# 發佈目錄：.next
```

**自架伺服器（Docker）**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## � 使用指南

### 首次使用流程

1. **首頁認證**（Portal 服務）：

   - 輸入使用者帳號密碼
   - 點擊「原始服務認證」完成雙重驗證
   - 系統檢查登入狀態與 Portal 存取權限

2. **API Key 設定**（外部服務）：
   - 前往「設定」頁面 (`/settings`)
   - 新增各 AI 服務的 API Key
   - 系統自動驗證 Key 有效性

### 聊天功能

**開始對話**

- 選擇服務模式（原始/外部）
- 選擇 AI 模型
- 調整參數（溫度、最大 token）
- 輸入訊息開始聊天

**會話管理**

- 自動建立與命名會話
- 側邊欄切換不同會話
- 會話重新命名與刪除
- 清空當前會話內容

**資料同步**

- 跨標籤頁即時同步
- 自動本地備份
- 錯誤狀態自動恢復

### 資料管理

**聊天記錄匯入匯出**

- **JSON 格式**：完整結構化資料，包含 metadata
- **CSV 格式**：適合試算表查看分析
- **自動去重**：匯入時自動處理重複資料
- **增量匯入**：支援與現有資料合併

**API Key 管理**

- **批量操作**：支援 CSV 格式批量匯入匯出
- **加密儲存**：客戶端 XOR 加密保護
- **分類管理**：按 AI 服務提供商分類
- **狀態監控**：即時顯示 API Key 有效性

## 🔧 API 參考

### 認證相關 API

**檢查登入狀態**

```http
POST /api/check-login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password",
  "baseUrl": "https://dgb01p240102.japaneast.cloudapp.azure.com"
}
```

**檢查存取權限**

```http
POST /api/check-access
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password",
  "baseUrl": "https://dgb01p240102.japaneast.cloudapp.azure.com"
}
```

### 聊天 API

**原始 Portal 服務**

```http
POST /api/chat
Content-Type: application/json

{
  "message": "您的問題",
  "username": "your-username",
  "password": "your-password",
  "baseUrl": "https://dgb01p240102.japaneast.cloudapp.azure.com",
  "id": "13",
  "fileContent": "optional-file-content"
}
```

**外部 AI 服務**

```http
POST /api/ai-chat
Content-Type: application/json

{
  "message": "您的問題",
  "service": "openai",
  "apiKey": "your-api-key",
  "model": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

### 回應格式

**成功回應**

```json
{
  "success": true,
  "response": "AI 回應內容",
  "model": "使用的模型",
  "usage": {
    "totalTokens": 150
  }
}
```

**錯誤回應**

```json
{
  "error": "錯誤訊息",
  "details": "詳細錯誤說明",
  "code": "ERROR_CODE"
}
```

## 🛠️ 開發工具與最佳實踐

### 代碼品質

- **TypeScript**：完整的類型安全保證
- **ESLint**：程式碼風格統一檢查
- **React Hooks**：現代化的狀態管理
- **模組化設計**：高內聚低耦合的組件架構

### 效能優化

- **Next.js 15**：最新的 App Router 與 React 19
- **Turbopack**：快速的開發建置工具
- **本地優先**：減少網路依賴的資料架構
- **懶載入**：按需載入組件與資源

### 測試策略

```bash
# 類型檢查
npx tsc --noEmit

# 程式碼品質檢查
npm run lint

# 建置測試
npm run build
```

## 🌟 進階功能

### 自定義擴展

- **Plugin 架構**：支援自定義 AI 服務擴展
- **主題系統**：可自定義 UI 主題
- **多語言支援**：國際化架構準備
- **Plugin Hook**：可插拔的功能模組

### 企業級功能

- **SSO 整合準備**：支援企業級單一登入
- **審計日誌**：完整的操作記錄
- **權限控制**：細粒度的用戶權限管理
- **批量操作**：大量數據處理支援

## 🔍 故障排除

### 常見問題

**1. API Key 無效**

```bash
# 檢查 API Key 格式
# OpenAI: sk-...
# Google: AIza...
# Anthropic: sk-ant-...
```

**2. Portal 服務連線失敗**

```bash
# 檢查網路連線
# 確認帳號密碼正確
# 檢查 baseUrl 設定
```

**3. 聊天記錄丟失**

```bash
# 檢查瀏覽器儲存空間
# 確認未開啟隱私模式
# 檢查 localStorage 權限
```

### 偵錯模式

```bash
# 開發模式啟動
npm run dev

# 檢查瀏覽器控制台
# 查看 Network 標籤
# 檢查 Application > Storage
```

## 🎯 路線圖

### 即將推出

- [ ] **語音輸入**：支援語音轉文字
- [ ] **圖片理解**：整合視覺 AI 模型
- [ ] **文件分析**：PDF/Word 文件理解
- [ ] **團隊協作**：多用戶共享會話

### 計劃功能

- [ ] **Plugin 市場**：第三方擴展生態
- [ ] **Advanced RAG**：知識庫整合
- [ ] **工作流程**：自動化任務處理
- [ ] **數據分析**：使用統計與分析

## 🤝 貢獻指南

### 參與方式

1. **Bug 回報**：透過 GitHub Issues 回報問題
2. **功能建議**：提出新功能的想法與需求
3. **代碼貢獻**：提交 Pull Request 改善專案
4. **文檔完善**：協助完善使用說明與 API 文檔

### 開發流程

```bash
# 1. Fork 專案
git clone https://github.com/your-username/Chatgpt_Reverse_Proxy.git

# 2. 建立分支
git checkout -b feature/your-feature-name

# 3. 開發與測試
npm run dev
npm run lint
npm run build

# 4. 提交變更
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name

# 5. 開啟 Pull Request
```

### 代碼規範

- 使用 TypeScript 進行開發
- 遵循現有的 ESLint 規則
- 編寫清楚的 commit 訊息
- 添加適當的註解與類型定義

## 📄 授權資訊

本專案採用 **MIT License** 開源授權

### 權限

✅ 商業使用  
✅ 修改  
✅ 分發  
✅ 私人使用

### 限制

❌ 責任  
❌ 保證

詳細授權內容請參考 [LICENSE](LICENSE) 檔案

## 🚨 重要聲明

### 使用條款

- 本專案僅供**學習研究**與**個人使用**
- 使用者需遵守各 AI 服務提供商的**服務條款**
- 請勿將本專案用於**違法或惡意目的**

### 隱私保護

- 所有對話資料僅儲存在**本地瀏覽器**
- 不會上傳或分享任何使用者資料
- API Key 採用**客戶端加密**儲存

### 免責聲明

- 使用者需自行承擔使用第三方 AI 服務的**風險與責任**
- 開發者不對 AI 回應內容的**準確性或適用性**負責
- 本專案不保證**持續可用性**或**錯誤修復**

## 📞 技術支援

### 獲得協助

- 📋 [GitHub Issues](https://github.com/zero2005x/Chatgpt_Reverse_Proxy/issues) - 問題回報與功能建議
- 📖 [使用文檔](/docs) - 詳細的使用說明
- 💬 [討論區](https://github.com/zero2005x/Chatgpt_Reverse_Proxy/discussions) - 社群討論與經驗分享

### 回報問題

提交 Issue 時請包含：

- 詳細的問題描述
- 重現步驟
- 瀏覽器與作業系統資訊
- 相關的錯誤訊息或截圖

---

<div align="center">

**🤖 AI Chat Multi-Service Platform**

_讓 AI 對話更簡單、更安全、更強大_

[![GitHub stars](https://img.shields.io/github/stars/zero2005x/Chatgpt_Reverse_Proxy?style=social)](https://github.com/zero2005x/Chatgpt_Reverse_Proxy/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/zero2005x/Chatgpt_Reverse_Proxy?style=social)](https://github.com/zero2005x/Chatgpt_Reverse_Proxy/network/members)

Made with ❤️ by the AI Proxy Team

</div>
