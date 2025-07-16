# 貢獻指南 - AI Chat Multi-Service Platform

感謝您對 AI Chat Multi-Service Platform 專案的貢獻興趣！本文檔提供了參與專案開發的詳細指南。

## 🚀 快速開始

### 1. 設定開發環境
```bash
# Fork 並複製專案
git clone https://github.com/zero2005x/Chatgpt_Reverse_Proxy.git
cd Chatgpt_Reverse_Proxy

# 安裝相依套件
npm install

# 複製環境變數範本
cp .env.example .env.local

# 編輯 .env.local 並填入必要的環境變數
```

### 2. 啟動開發伺服器
```bash
# 開發模式
npm run dev

# 建置測試
npm run build

# 啟動生產伺服器
npm start
```

### 3. 建立功能分支
```bash
# 從 main 分支建立新分支
git checkout -b feature/your-feature-name

# 或者修復錯誤
git checkout -b bugfix/issue-description
```

## 📋 開發規範

### 程式碼風格
- 遵循現有的程式碼風格和命名慣例
- 使用 TypeScript 確保型別安全
- 所有元件都應該有適當的型別定義
- 遵循 React Hooks 最佳實踐
- 使用 Tailwind CSS 進行樣式設計

### 程式碼品質檢查
```bash
# 執行 ESLint 檢查
npm run lint

# 自動修正 ESLint 錯誤
npm run lint:fix

# 型別檢查
npm run type-check

# 建置檢查
npm run build
```

### 提交訊息規範
使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` 新功能
- `fix:` 錯誤修復
- `docs:` 文檔更新
- `style:` 程式碼格式調整（不影響功能）
- `refactor:` 程式碼重構
- `test:` 測試相關
- `chore:` 建置或輔助工具的變動
- `perf:` 效能改善
- `ci:` CI/CD 相關

**範例：**
```
feat: 新增 OpenAI GPT-4 服務支援
fix: 修復聊天記錄重複問題
docs: 更新 API 文檔
refactor: 重構訊息處理邏輯
```

### 分支命名規範
- `feature/功能描述` - 新功能開發
- `bugfix/問題描述` - 錯誤修復
- `hotfix/緊急修復` - 緊急修復
- `docs/文檔更新` - 文檔更新
- `refactor/重構描述` - 程式碼重構

## 🏗️ 專案架構

### 目錄結構
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── chat/              # 聊天頁面
│   ├── docs/              # 文檔頁面
│   └── settings/          # 設定頁面
├── components/            # React 元件
│   ├── ChatInput.tsx      # 聊天輸入
│   ├── ChatMessage.tsx    # 訊息顯示
│   ├── ChatSidebar.tsx    # 側邊欄
│   └── ...
├── hooks/                 # 自定義 Hooks
│   ├── useApiKeys.ts      # API 金鑰管理
│   ├── useChatHistory.ts  # 聊天記錄
│   └── usePortalAuth.ts   # Portal 認證
└── types/                 # 型別定義
    └── message.ts         # 訊息型別
```

### 核心概念
- **多服務支援**: 支援多種 AI 服務 (ChatGPT, Claude, Gemini)
- **本地優先**: 所有資料儲存在瀏覽器本地
- **模組化設計**: 元件和功能高度模組化
- **型別安全**: 全面使用 TypeScript

## 🧪 測試指南

### 手動測試
在提交 PR 之前，請確保以下功能正常：

1. **基本功能測試**
   - [ ] 應用程式正常啟動
   - [ ] 健康檢查端點回應正常 (`/api/health`)
   - [ ] 主頁面載入正常

2. **聊天功能測試**
   - [ ] 能夠發送訊息
   - [ ] 訊息正確顯示
   - [ ] 聊天記錄保存正常
   - [ ] 側邊欄功能正常

3. **設定功能測試**
   - [ ] API 金鑰管理功能
   - [ ] 服務選擇器功能
   - [ ] 匯入/匯出功能

4. **瀏覽器相容性**
   - [ ] Chrome 測試通過
   - [ ] Firefox 測試通過
   - [ ] Safari 測試通過（如果可能）

### 自動化測試
```bash
# 執行所有檢查
npm run lint && npm run type-check && npm run build
```

## 🐛 錯誤回報

### 回報錯誤前的檢查
1. 確認您使用的是最新版本
2. 搜尋 [Issues](https://github.com/zero2005x/Chatgpt_Reverse_Proxy/issues) 確認問題未被回報
3. 檢查瀏覽器控制台是否有錯誤訊息

### 錯誤回報範本
```markdown
**描述**
簡短描述遇到的問題

**重現步驟**
1. 前往 '...'
2. 點擊 '....'
3. 捲動到 '....'
4. 看到錯誤

**預期行為**
描述您預期應該發生什麼

**截圖**
如果適用，請新增截圖來說明問題

**環境資訊**
- 作業系統: [例如 Windows 11]
- 瀏覽器: [例如 Chrome 120]
- Node.js 版本: [例如 18.17.0]
```

## 💡 功能建議

### 提交功能建議前
1. 確認功能符合專案目標
2. 檢查是否已有類似建議
3. 考慮實作的複雜度和維護成本

### 功能建議範本
```markdown
**功能描述**
清楚描述您希望新增的功能

**解決的問題**
這個功能解決了什麼問題？

**建議的解決方案**
描述您希望如何實現這個功能

**替代方案**
您考慮過的其他替代解決方案

**其他背景**
任何其他相關的背景資訊或截圖
```

## 📝 Pull Request 流程

### 提交前檢查清單
- [ ] 程式碼通過 ESLint 檢查
- [ ] TypeScript 型別檢查通過
- [ ] 建置成功
- [ ] 功能經過手動測試
- [ ] 提交訊息符合規範
- [ ] 文檔已更新（如需要）

### PR 範本
```markdown
## 變更摘要
簡短描述這次 PR 的變更內容

## 變更類型
- [ ] 錯誤修復
- [ ] 新功能
- [ ] 程式碼重構
- [ ] 文檔更新
- [ ] 效能改善
- [ ] 其他：

## 測試
描述您如何測試這些變更

## 相關 Issue
關閉 #(issue number)

## 截圖（如適用）
新增相關截圖

## 檢查清單
- [ ] 程式碼通過所有檢查
- [ ] 新增了適當的文檔
- [ ] 測試涵蓋了新的程式碼
```

### Code Review 過程
1. 自動檢查通過後，維護者會進行程式碼審查
2. 根據反饋進行必要的修改
3. 審查通過後，PR 將被合併到主分支

## 🤝 社群準則

### 行為準則
- 保持尊重和專業的態度
- 歡迎不同觀點和建設性的討論
- 幫助新貢獻者融入社群
- 遵循開源軟體的最佳實踐

### 溝通管道
- **GitHub Issues**: 錯誤回報和功能建議
- **GitHub Discussions**: 一般討論和問題
- **Pull Requests**: 程式碼審查和技術討論

## 📚 開發資源

### 技術文檔
- [Next.js 文檔](https://nextjs.org/docs)
- [React 文檔](https://react.dev)
- [TypeScript 文檔](https://www.typescriptlang.org/docs)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)

### 專案相關
- [API 文檔](./API.md)
- [部署指南](./DEPLOYMENT.md)
- [專案說明](./README.md)

## 🎉 認可貢獻者

所有貢獻者都會在專案的 README.md 中被列出。我們感謝每一位貢獻者的付出！

### 貢獻者類型
- **程式碼貢獻**: 新功能、錯誤修復、效能改善
- **文檔貢獻**: 文檔撰寫、翻譯、範例
- **設計貢獻**: UI/UX 設計、圖示、品牌
- **測試貢獻**: 測試案例、錯誤回報、品質保證
- **社群貢獻**: 幫助其他用戶、推廣專案

---

再次感謝您的貢獻！如果您有任何問題，請隨時透過 GitHub Issues 與我們聯繫。

## 🔧 Development Setup

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
```bash
cp .env.example .env.local
```

### Development Server
```bash
npm run dev
```

### Build and Test
```bash
npm run build
npm run lint
```

## 📝 Pull Request Process

1. **Update documentation** if necessary
2. **Ensure all tests pass** and code builds successfully
3. **Write descriptive commit messages**
4. **Create a pull request** with:
   - Clear title and description
   - Reference any related issues
   - Screenshots if UI changes are involved

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass
- [ ] Code builds successfully
- [ ] Manually tested

## Screenshots (if applicable)
Add screenshots here

## Related Issues
Closes #123
```

## 🐛 Bug Reports

When reporting bugs, please include:
- **Environment details** (OS, browser, Node.js version)
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Error messages or logs**
- **Screenshots** if applicable

## 💡 Feature Requests

For new features, please:
- **Check existing issues** first
- **Describe the problem** your feature solves
- **Provide implementation details** if possible
- **Consider backwards compatibility**

## 🔒 Security

If you discover a security vulnerability:
- **DO NOT** open a public issue
- **Email** the maintainers directly
- **Wait for confirmation** before disclosing

## 📖 Documentation

Help improve documentation by:
- **Fixing typos** and grammar
- **Adding examples** and use cases
- **Updating outdated information**
- **Improving clarity**

## 🌟 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **GitHub releases** changelog
- **Special thanks** for significant contributions

## 📞 Questions?

- **GitHub Issues** for general questions
- **GitHub Discussions** for community discussion
- **README.md** for basic setup help

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AI Proxy! 🎉