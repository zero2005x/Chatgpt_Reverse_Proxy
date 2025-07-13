# AI Chat Proxy (Next.js)

這個 Next.js 專案作為一個中介層，用於將來自外部網站的對話請求轉發到 `https://dgb01p240102.japaneast.cloudapp.azure.com/` 上的 AI 模組。專案實現了完整的認證流程、檔案上傳支援和智能端點切換功能。

## 專案設定

1.  **安裝依賴：**
    ```bash
    npm install
    ```
2.  **運行開發伺服器：**
    ```bash
    npm run dev
    ```
    專案將在 `http://localhost:3000` 上運行。

## API 端點

### `POST /api/chat`

這個端點用於向 AI 模組發送對話請求並接收回應。

**請求方法：** `POST`

**請求頭：**

*   `Content-Type: application/json`

**請求體 (JSON):**

**基本文字對話：**
```json
{
  "message": "你的對話內容",
  "id": "AI模組的ID (可選，預設為 13)",
  "username": "您的登入帳號",
  "password": "您的登入密碼"
}
```

**包含檔案上傳：**
```json
{
  "message": "請分析上傳的檔案",
  "id": "13",
  "username": "您的登入帳號",
  "password": "您的登入密碼",
  "file": {
    "data": "data:text/plain;base64,檔案的base64編碼內容"
  }
}
```

**回應體 (JSON):**

```json
{
  "reply": "AI模組的回覆"
}
```

**錯誤回應 (JSON):**

```json
{
  "error": "錯誤訊息"
}
```

## 使用範例

### 基本文字對話 (curl)
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"message": "推薦台北美食", "id": "13", "username": "your_username", "password": "your_password"}' \
  http://localhost:3000/api/chat
```

### 檔案上傳對話 (curl)
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"message": "請分析這個檔案", "id": "13", "username": "your_username", "password": "your_password", "file": {"data": "data:text/plain;base64,SGVsbG8gV29ybGQ="}}' \
  http://localhost:3000/api/chat
```

### PowerShell 範例
```powershell
# 基本對話
$body = '{"message":"What are the best restaurants in Taipei?","id":"13","username":"your_username","password":"your_password"}'
Invoke-RestMethod -Uri http://localhost:3000/api/chat -Method POST -ContentType "application/json" -Body $body

# 檔案上傳對話
$body = @{
    message = "Please analyze the uploaded file"
    id = "13"
    username = "your_username"
    password = "your_password"
    file = @{
        data = "data:text/plain;base64,SGVsbG8gV29ybGQ="
    }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri http://localhost:3000/api/chat -Method POST -ContentType "application/json" -Body $body
```

## 功能特色

*   **用戶認證：** 使用者提供自己的帳號密碼，系統會自動進行登入並獲取有效的 API 金鑰。
*   **檔案上傳支援：** 支援 base64 編碼的檔案上傳，包括文字檔、PDF、CSV 等多種格式。
*   **智能端點切換：** 自動嘗試多個 AI 端點，確保最高的連接成功率。
*   **完整錯誤處理：** 提供詳細的錯誤訊息和狀態回報。
*   **對話式回應：** 回傳完整、自然的 AI 對話回應，就像與真人對話一樣。

## 部署

您可以將此 Next.js 應用程式部署到任何支援 Node.js 的平台，例如 Vercel、Netlify 或您自己的伺服器。