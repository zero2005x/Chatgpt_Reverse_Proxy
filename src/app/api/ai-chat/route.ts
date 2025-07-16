import { NextRequest, NextResponse } from 'next/server';

interface ChatRequest {
  message: string;
  service: string;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// 不同AI服務的API端點配置
const AI_ENDPOINTS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    payload: (message: string, model = 'gpt-3.5-turbo', temperature = 0.7, maxTokens = 2000) => ({
      model,
      messages: [{ role: 'user', content: message }],
      temperature,
      max_tokens: maxTokens,
    }),
    parseResponse: (data: any) => data.choices[0]?.message?.content || '無回應'
  },
  
  google: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    headers: (apiKey: string) => ({
      'Content-Type': 'application/json',
    }),
    payload: (message: string) => ({
      contents: [{ parts: [{ text: message }] }]
    }),
    parseResponse: (data: any) => data.candidates[0]?.content?.parts[0]?.text || '無回應'
  },

  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    payload: (message: string, model = 'mistral-medium', temperature = 0.7, maxTokens = 2000) => ({
      model,
      messages: [{ role: 'user', content: message }],
      temperature,
      max_tokens: maxTokens,
    }),
    parseResponse: (data: any) => data.choices[0]?.message?.content || '無回應'
  },

  cohere: {
    url: 'https://api.cohere.ai/v1/generate',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    payload: (message: string, model = 'command', temperature = 0.7, maxTokens = 2000) => ({
      model,
      prompt: message,
      temperature,
      max_tokens: maxTokens,
    }),
    parseResponse: (data: any) => data.generations[0]?.text || '無回應'
  },

  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    payload: (message: string, model = 'mixtral-8x7b-32768', temperature = 0.7, maxTokens = 2000) => ({
      model,
      messages: [{ role: 'user', content: message }],
      temperature,
      max_tokens: maxTokens,
    }),
    parseResponse: (data: any) => data.choices[0]?.message?.content || '無回應'
  },

  xai: {
    url: 'https://api.x.ai/v1/chat/completions',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    payload: (message: string, model = 'grok-4-0709', temperature = 0.7, maxTokens = 3000) => ({
      model,
      messages: [{ role: 'user', content: message }],
      temperature,
      max_tokens: maxTokens,
    }),
    parseResponse: (data: any) => data.choices[0]?.message?.content || '無回應'
  },

  // 通用的 OpenAI 兼容端點
  generic: {
    url: '', // 這個會由前端傳入
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    payload: (message: string, model = 'gpt-3.5-turbo', temperature = 0.7, maxTokens = 2000) => ({
      model,
      messages: [{ role: 'user', content: message }],
      temperature,
      max_tokens: maxTokens,
    }),
    parseResponse: (data: any) => data.choices[0]?.message?.content || '無回應'
  }
};

export async function POST(req: NextRequest) {
  try {
    const { message, service, apiKey, model, temperature, maxTokens, customEndpoint }: ChatRequest & { customEndpoint?: string } = await req.json();

    if (!message || !service || !apiKey) {
      return NextResponse.json({ 
        error: '缺少必要參數：message、service 或 apiKey' 
      }, { status: 400 });
    }

    const serviceConfig = AI_ENDPOINTS[service as keyof typeof AI_ENDPOINTS];
    if (!serviceConfig) {
      return NextResponse.json({ 
        error: `不支援的AI服務：${service}` 
      }, { status: 400 });
    }

    // 對於通用端點，使用自定義 URL
    const apiUrl = service === 'generic' && customEndpoint ? customEndpoint : serviceConfig.url;
    
    if (!apiUrl) {
      return NextResponse.json({ 
        error: '缺少API端點URL' 
      }, { status: 400 });
    }

    const headers = serviceConfig.headers(apiKey);
    const payload = serviceConfig.payload(message, model, temperature, maxTokens);

    // 對於 Google API，需要在 URL 中加入 API key
    const finalUrl = service === 'google' ? `${apiUrl}?key=${apiKey}` : apiUrl;

    console.log(`正在呼叫 ${service} API...`);
    
    const response = await fetch(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${service} API 錯誤:`, response.status, errorText);
      
      return NextResponse.json({ 
        error: `${service} API 錯誤: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    const reply = serviceConfig.parseResponse(data);

    return NextResponse.json({ 
      reply,
      service,
      model: model || 'default'
    });

  } catch (error) {
    console.error('AI Chat API 錯誤:', error);
    return NextResponse.json({ 
      error: '處理請求時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}