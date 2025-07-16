# 🔌 API 文檔

## 概述

AI Chat Multi-Service Platform 提供統一的 API 介面，支援原始 Portal 服務和 27+ 種外部 AI 服務。所有 API 都遵循 RESTful 設計原則，使用 JSON 格式進行資料交換。

## 基礎資訊

- **Base URL**: `https://your-domain.vercel.app/api`
- **Content-Type**: `application/json`
- **Rate Limit**: 10 requests/minute per IP
- **Max Request Size**: 5MB

## 認證與授權

### Portal 服務認證

Portal 服務使用雙重認證機制：

1. **登入狀態檢查** - 驗證帳號密碼
2. **存取權限檢查** - 驗證 Portal 存取權限

### 外部服務認證

外部 AI 服務使用各自的 API Key 進行認證。

## API 端點

### 🔐 認證相關

#### 檢查登入狀態

驗證使用者帳號密碼並獲取 session cookie。

```http
POST /api/check-login
```

**請求參數**

```json
{
  "username": "your-username",
  "password": "your-password", 
  "baseUrl": "https://dgb01p240102.japaneast.cloudapp.azure.com"
}
```

**成功回應**

```json
{
  "success": true,
  "isLoggedIn": true,
  "sessionCookie": "JSESSIONID=ABC123...",
  "message": "登入成功"
}
```

**錯誤回應**

```json
{
  "success": false,
  "isLoggedIn": false,
  "error": "帳號或密碼錯誤",
  "details": "Invalid credentials provided"
}
```

#### 檢查存取權限

驗證使用者是否有 Portal 存取權限。

```http
POST /api/check-access
```

**請求參數**

```json
{
  "username": "your-username",
  "password": "your-password",
  "baseUrl": "https://dgb01p240102.japaneast.cloudapp.azure.com"
}
```

**成功回應**

```json
{
  "success": true,
  "hasAccess": true,
  "data": [
    {
      "id": "13",
      "name": "AI Assistant Portal",
      "type": "chat"
    }
  ],
  "message": "存取權限驗證成功"
}
```

**錯誤回應**

```json
{
  "success": false,
  "hasAccess": false,
  "error": "無 Portal 存取權限",
  "details": "User does not have portal access"
}
```

### 💬 聊天相關

#### 原始 Portal 服務

與企業內部 Portal AI 服務進行對話。

```http
POST /api/chat
```

**請求參數**

```json
{
  "message": "您好，請幫我分析這個問題",
  "username": "your-username",
  "password": "your-password",
  "baseUrl": "https://dgb01p240102.japaneast.cloudapp.azure.com",
  "id": "13",
  "fileContent": "optional file content for analysis"
}
```

**成功回應**

```json
{
  "success": true,
  "response": "根據您的問題，我的分析如下：...",
  "model": "portal-ai-v1",
  "timestamp": "2025-01-16T08:30:00.000Z",
  "usage": {
    "inputTokens": 15,
    "outputTokens": 128,
    "totalTokens": 143
  }
}
```

**錯誤回應**

```json
{
  "error": "Portal 服務暫時無法使用",
  "details": "Connection timeout to portal service",
  "code": "PORTAL_TIMEOUT",
  "timestamp": "2025-01-16T08:30:00.000Z"
}
```

#### 外部 AI 服務

與外部 AI 服務提供商進行對話。

```http
POST /api/ai-chat
```

**請求參數**

```json
{
  "message": "Explain quantum computing in simple terms",
  "service": "openai",
  "apiKey": "sk-proj-...",
  "model": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 1000,
  "customEndpoint": "https://api.custom-provider.com/v1/chat" // 可選，用於自定義端點
}
```

**支援的服務類型**

| Service | Models | Notes |
|---------|--------|-------|
| `openai` | gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo | OpenAI 官方模型 |
| `google` | gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro | Google Gemini 系列 |
| `anthropic` | claude-3.5-sonnet, claude-3-opus, claude-3-sonnet | Anthropic Claude 系列 |
| `mistral` | mistral-large-latest, open-mixtral-8x22b | Mistral AI 模型 |
| `cohere` | command-r-plus, command-r, command-light | Cohere 指令模型 |
| `groq` | llama3-70b-8192, llama3-8b-8192, mixtral-8x7b-32768 | Groq 加速推理 |
| `xai` | grok-4-0709, grok-3, grok-3-mini | xAI Grok 系列 |

**成功回應**

```json
{
  "success": true,
  "response": "Quantum computing is a revolutionary technology that...",
  "model": "gpt-4o",
  "service": "openai",
  "timestamp": "2025-01-16T08:30:00.000Z",
  "usage": {
    "promptTokens": 12,
    "completionTokens": 156,
    "totalTokens": 168
  }
}
```

**錯誤回應**

```json
{
  "error": "API Key 無效或已過期",
  "details": "Invalid API key provided",
  "code": "INVALID_API_KEY",
  "service": "openai",
  "timestamp": "2025-01-16T08:30:00.000Z"
}
```

## 錯誤代碼

| 代碼 | 描述 | HTTP狀態 |
|------|------|----------|
| `INVALID_API_KEY` | API Key 無效 | 401 |
| `RATE_LIMIT_EXCEEDED` | 超過請求限制 | 429 |
| `SERVICE_UNAVAILABLE` | 服務暫時無法使用 | 503 |
| `INVALID_REQUEST` | 請求參數錯誤 | 400 |
| `PORTAL_TIMEOUT` | Portal 服務逾時 | 504 |
| `AUTH_FAILED` | 認證失敗 | 401 |
| `ACCESS_DENIED` | 存取被拒絕 | 403 |
| `CONTENT_TOO_LARGE` | 內容過大 | 413 |

## Rate Limiting

為確保服務穩定性，API 實施以下限制：

- **請求頻率**: 每分鐘最多 10 次請求
- **請求大小**: 單次請求最大 5MB
- **訊息長度**: 最大 10,000 字元
- **並發請求**: 每個 IP 最多 3 個並發請求

超過限制時的回應：

```json
{
  "error": "Request rate limit exceeded",
  "details": "Maximum 10 requests per minute allowed",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "timestamp": "2025-01-16T08:30:00.000Z"
}
```

## 安全性

### 輸入驗證

所有 API 端點都會進行嚴格的輸入驗證：

- **XSS 防護**: 過濾惡意腳本
- **SQL 注入防護**: 參數化查詢
- **內容長度限制**: 防止 DoS 攻擊
- **格式驗證**: 確保資料格式正確

### 安全標頭

API 回應包含以下安全標頭：

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### HTTPS

生產環境強制使用 HTTPS 連接，確保資料傳輸安全。

## SDK 與範例

### JavaScript/TypeScript

```typescript
interface ChatRequest {
  message: string;
  service: string;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

async function sendMessage(request: ChatRequest) {
  const response = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

// 使用範例
try {
  const result = await sendMessage({
    message: "Hello, how are you?",
    service: "openai",
    apiKey: "sk-proj-...",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 1000
  });
  
  console.log('AI Response:', result.response);
} catch (error) {
  console.error('Error:', error);
}
```

### Python

```python
import requests
import json

def send_message(message, service, api_key, model=None, temperature=0.7, max_tokens=1000):
    url = "https://your-domain.vercel.app/api/ai-chat"
    
    payload = {
        "message": message,
        "service": service,
        "apiKey": api_key,
        "model": model,
        "temperature": temperature,
        "maxTokens": max_tokens
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API Error: {response.status_code} - {response.text}")

# 使用範例
try:
    result = send_message(
        message="Hello, how are you?",
        service="openai",
        api_key="sk-proj-...",
        model="gpt-4o",
        temperature=0.7,
        max_tokens=1000
    )
    
    print("AI Response:", result["response"])
except Exception as e:
    print("Error:", e)
```

### cURL

```bash
# 外部 AI 服務
curl -X POST https://your-domain.vercel.app/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, how are you?",
    "service": "openai",
    "apiKey": "sk-proj-...",
    "model": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 1000
  }'

# Portal 服務
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "您好，請幫我分析這個問題",
    "username": "your-username",
    "password": "your-password",
    "baseUrl": "https://dgb01p240102.japaneast.cloudapp.azure.com",
    "id": "13"
  }'
```

## 最佳實踐

### 錯誤處理

```typescript
async function handleApiCall(request: ChatRequest) {
  try {
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // 處理不同類型的錯誤
      switch (data.code) {
        case 'RATE_LIMIT_EXCEEDED':
          // 等待後重試
          await new Promise(resolve => setTimeout(resolve, data.retryAfter * 1000));
          return handleApiCall(request);
          
        case 'INVALID_API_KEY':
          // 提示使用者更新 API Key
          throw new Error('請檢查 API Key 是否正確');
          
        default:
          throw new Error(data.error || 'Unknown error');
      }
    }
    
    return data;
    
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

### 重試機制

```typescript
async function retryableApiCall(request: ChatRequest, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await sendMessage(request);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // 指數退避
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 常見問題

### Q: 如何獲取 API Key？

**A**: 前往各 AI 服務提供商的官方網站註冊並獲取 API Key：
- OpenAI: https://platform.openai.com/api-keys
- Google: https://makersuite.google.com/app/apikey
- Anthropic: https://console.anthropic.com/

### Q: Portal 服務連線失敗怎麼辦？

**A**: 請檢查：
1. 帳號密碼是否正確
2. baseUrl 是否可以正常存取
3. 網路連線是否正常
4. 是否有 Portal 存取權限

### Q: 如何處理 Rate Limit？

**A**: 實施重試機制，在收到 429 狀態碼時等待指定時間後重試。

### Q: 支援串流回應嗎？

**A**: 目前不支援串流回應，所有回應都是一次性返回完整內容。

## 更新日誌

### v1.0.0 (2025-01-16)
- 首次發布 API 文檔
- 支援 Portal 服務與外部 AI 服務
- 實施 Rate Limiting 與安全防護
- 提供完整的錯誤處理機制

---

如有問題或建議，請提交 [GitHub Issue](https://github.com/zero2005x/Chatgpt_Reverse_Proxy/issues)。
