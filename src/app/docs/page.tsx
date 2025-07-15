'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'json' | 'csv' | 'xlsx'>('json');

  const jsonSample = {
    "sessions": [
      {
        "id": "session-1",
        "name": "AI 對話範例",
        "messages": [
          {
            "id": "msg-1",
            "role": "user",
            "content": "你好，請介紹一下你自己",
            "timestamp": "2024-01-01T10:00:00.000Z"
          },
          {
            "id": "msg-2",
            "role": "assistant",
            "content": "您好！我是 AI 助手，很高興為您服務。我可以幫助您回答問題、提供資訊和協助各種任務。",
            "timestamp": "2024-01-01T10:00:05.000Z",
            "model": "gpt-4"
          }
        ],
        "createdAt": "2024-01-01T10:00:00.000Z",
        "lastModified": "2024-01-01T10:00:05.000Z"
      }
    ]
  };

  const csvSample = `name,userMessage,assistantMessage,model
AI 對話範例,你好，請介紹一下你自己,您好！我是 AI 助手，很高興為您服務。我可以幫助您回答問題、提供資訊和協助各種任務。,gpt-4
技術問題,如何學習 JavaScript？,學習 JavaScript 建議從基礎語法開始，然後練習 DOM 操作和事件處理。,claude-3
日常對話,今天天氣如何？,我無法獲取實時天氣資訊，建議您查看天氣預報網站或應用程式。,gemini-pro`;

  const downloadSample = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateXLSXSample = () => {
    // 這裡模擬 XLSX 檔案下載
    const xlsxContent = `name\tuserMessage\tassistantMessage\tmodel
AI 對話範例\t你好，請介紹一下你自己\t您好！我是 AI 助手，很高興為您服務。我可以幫助您回答問題、提供資訊和協助各種任務。\tgpt-4
技術問題\t如何學習 JavaScript？\t學習 JavaScript 建議從基礎語法開始，然後練習 DOM 操作和事件處理。\tclaude-3
日常對話\t今天天氣如何？\t我無法獲取實時天氣資訊，建議您查看天氣預報網站或應用程式。\tgemini-pro`;
    
    downloadSample('chat-sample.xlsx', xlsxContent, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  const apiKeySample = {
    "apiKeys": [
      {
        "service": "openai",
        "key": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "label": "OpenAI GPT-4"
      },
      {
        "service": "google",
        "key": "AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "label": "Google Gemini"
      },
      {
        "service": "anthropic",
        "key": "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "label": "Claude 3"
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            資料結構說明
          </h1>
          <p className="text-gray-600">
            聊天記錄與 API Key 的匯入匯出格式說明
          </p>
        </div>

        {/* 導航 */}
        <div className="flex justify-center space-x-4 mb-8">
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            回到首頁
          </Link>
          <Link
            href="/chat"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            開始聊天
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            API 設定
          </Link>
        </div>

        {/* 聊天記錄格式 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              聊天記錄格式
            </h2>
            
            {/* 標籤切換 */}
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveTab('json')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'json'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                JSON 格式
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'csv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                CSV 格式
              </button>
              <button
                onClick={() => setActiveTab('xlsx')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'xlsx'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                XLSX 格式
              </button>
            </div>

            {/* JSON 格式說明 */}
            {activeTab === 'json' && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">JSON 格式說明</h3>
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">資料結構：</h4>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• <code className="bg-gray-100 px-1 rounded">sessions</code>: 對話會話陣列</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">id</code>: 唯一識別碼</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">name</code>: 對話名稱</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">messages</code>: 訊息陣列</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">role</code>: 角色 (user/assistant)</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">content</code>: 訊息內容</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">timestamp</code>: 時間戳記 (ISO 8601)</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">model</code>: 使用的 AI 模型 (可選)</li>
                  </ul>
                </div>
                
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">範例：</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(jsonSample, null, 2)}
                  </pre>
                </div>
                
                <button
                  onClick={() => downloadSample('chat-sample.json', JSON.stringify(jsonSample, null, 2), 'application/json')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  下載範例檔案
                </button>
              </div>
            )}

            {/* CSV 格式說明 */}
            {activeTab === 'csv' && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">CSV 格式說明</h3>
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">欄位說明：</h4>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• <code className="bg-gray-100 px-1 rounded">name</code>: 對話名稱</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">userMessage</code>: 用戶訊息</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">assistantMessage</code>: AI 回應</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">model</code>: 使用的 AI 模型</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">範例：</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {csvSample}
                  </pre>
                </div>

                <button
                  onClick={() => downloadSample('chat-sample.csv', csvSample, 'text/csv')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  下載範例檔案
                </button>
              </div>
            )}

            {/* XLSX 格式說明 */}
            {activeTab === 'xlsx' && (
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-3">XLSX 格式說明</h3>
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">工作表結構：</h4>
                  <ul className="text-sm text-gray-600 space-y-1 mb-4">
                    <li>• 第一行為標題列</li>
                    <li>• 每行代表一組對話 (用戶訊息 + AI 回應)</li>
                    <li>• 欄位與 CSV 格式相同</li>
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">欄位說明：</h4>
                  <table className="min-w-full border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">欄位</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">說明</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-600">name</td>
                        <td className="px-4 py-2 text-sm text-gray-600">對話名稱</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-600">userMessage</td>
                        <td className="px-4 py-2 text-sm text-gray-600">用戶訊息</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-600">assistantMessage</td>
                        <td className="px-4 py-2 text-sm text-gray-600">AI 回應</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-sm text-gray-600">model</td>
                        <td className="px-4 py-2 text-sm text-gray-600">使用的 AI 模型</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={generateXLSXSample}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  下載範例檔案
                </button>
              </div>
            )}
          </div>
        </div>

        {/* API Key 格式 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              API Key 格式
            </h2>
            
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">JSON 格式說明</h3>
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">資料結構：</h4>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li>• <code className="bg-gray-100 px-1 rounded">apiKeys</code>: API Key 陣列</li>
                  <li>• <code className="bg-gray-100 px-1 rounded">service</code>: 服務名稱 (openai, google, anthropic 等)</li>
                  <li>• <code className="bg-gray-100 px-1 rounded">key</code>: API Key 值</li>
                  <li>• <code className="bg-gray-100 px-1 rounded">label</code>: 顯示名稱 (可選)</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">範例：</h4>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(apiKeySample, null, 2)}
                </pre>
              </div>

              <button
                onClick={() => downloadSample('api-keys-sample.json', JSON.stringify(apiKeySample, null, 2), 'application/json')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                下載範例檔案
              </button>
            </div>
          </div>
        </div>

        {/* 支援的服務 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              支援的 AI 服務
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700">主要服務</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• openai (OpenAI GPT)</li>
                  <li>• google (Google Gemini)</li>
                  <li>• anthropic (Claude)</li>
                  <li>• mistral (Mistral AI)</li>
                  <li>• cohere (Cohere)</li>
                  <li>• groq (Groq)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700">雲端服務</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• azure-openai (Azure OpenAI)</li>
                  <li>• huggingface (Hugging Face)</li>
                  <li>• together (Together AI)</li>
                  <li>• fireworks (Fireworks AI)</li>
                  <li>• openrouter (OpenRouter)</li>
                  <li>• hyperbolic (Hyperbolic)</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700">其他服務</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• replicate (Replicate)</li>
                  <li>• deepinfra (DeepInfra)</li>
                  <li>• perplexity (Perplexity)</li>
                  <li>• anyscale (Anyscale)</li>
                  <li>• xai (x.ai Grok)</li>
                  <li>• 更多...</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}