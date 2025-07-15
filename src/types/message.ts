export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

export interface ApiKey {
  service: 'openai' | 'google' | 'azure-openai' | 'cohere' | 'ai21' | 'huggingface' | 'together' | 'fireworks' | 'openrouter' | 'hyperbolic' | 'replicate' | 'groq' | 'deepinfra' | 'perplexity' | 'anyscale' | 'novita' | 'mistral' | 'yandex' | 'doubao' | 'qwen' | 'ernie' | 'hunyuan' | 'zhipu' | 'moonshot' | 'minimax' | '01ai' | 'baichuan' | 'xai';
  key: string;
  label?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: string;
  lastModified: string;
}

export interface LoginStatus {
  isLoggedIn: boolean;
  status: 'pending' | 'success' | 'failed' | 'not_checked';
  message?: string;
}

export interface PortalAccess {
  hasAccess: boolean;
  status: 'pending' | 'success' | 'failed' | 'not_checked';
  data?: any[];
  message?: string;
}