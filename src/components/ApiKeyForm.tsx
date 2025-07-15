import { useState } from 'react';
import { ApiKey } from '@/types/message';

const AI_SERVICES = {
  '國際': [
    { value: 'openai', label: 'OpenAI (GPT)' },
    { value: 'google', label: 'Google (Gemini/PaLM)' },
    { value: 'azure-openai', label: 'Microsoft Azure OpenAI' },
    { value: 'cohere', label: 'Cohere' },
    { value: 'ai21', label: 'AI21 Labs' },
    { value: 'huggingface', label: 'Hugging Face' },
    { value: 'together', label: 'Together AI' },
    { value: 'fireworks', label: 'Fireworks AI' },
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'hyperbolic', label: 'Hyperbolic' },
    { value: 'replicate', label: 'Replicate' },
    { value: 'groq', label: 'Groq' },
    { value: 'deepinfra', label: 'DeepInfra' },
    { value: 'perplexity', label: 'Perplexity' },
    { value: 'anyscale', label: 'Anyscale' },
    { value: 'novita', label: 'Novita' },
    { value: 'xai', label: 'x.ai (Grok)' }
  ],
  '歐洲': [
    { value: 'mistral', label: 'Mistral AI' }
  ],
  '俄羅斯': [
    { value: 'yandex', label: 'YandexGPT' }
  ],
  '中國': [
    { value: 'doubao', label: 'ByteDance (Doubao)' },
    { value: 'qwen', label: 'Alibaba (Qwen)' },
    { value: 'ernie', label: 'Baidu (Ernie)' },
    { value: 'hunyuan', label: 'Tencent (Hunyuan)' },
    { value: 'zhipu', label: 'Zhipu AI' },
    { value: 'moonshot', label: 'Moonshot (Kimi)' },
    { value: 'minimax', label: 'Minimax' },
    { value: '01ai', label: '01.AI' },
    { value: 'baichuan', label: 'Baichuan' }
  ]
};

interface ApiKeyFormProps {
  onAddApiKey: (apiKey: Omit<ApiKey, 'id'>) => void;
  isLoading?: boolean;
}

export default function ApiKeyForm({ onAddApiKey, isLoading = false }: ApiKeyFormProps) {
  const [formData, setFormData] = useState({
    service: 'openai' as ApiKey['service'],
    key: '',
    label: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key.trim()) return;
    
    const selectedService = Object.values(AI_SERVICES).flat().find(s => s.value === formData.service);
    
    onAddApiKey({
      service: formData.service,
      key: formData.key.trim(),
      label: formData.label.trim() || selectedService?.label || formData.service.toUpperCase()
    });
    
    // 重置表單
    setFormData({
      service: 'openai',
      key: '',
      label: ''
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="border-b border-gray-200 pb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">新增 API Key</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">
              AI 服務
            </label>
            <select
              id="service"
              value={formData.service}
              onChange={(e) => handleInputChange('service', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(AI_SERVICES).map(([category, services]) => (
                <optgroup key={category} label={category}>
                  {services.map(service => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
              標籤 (可選)
            </label>
            <input
              id="label"
              type="text"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="例如：主要 OpenAI Key"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label htmlFor="key" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                id="key"
                type="password"
                value={formData.key}
                onChange={(e) => handleInputChange('key', e.target.value)}
                placeholder="輸入您的 API Key"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!formData.key.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '儲存中...' : '新增'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}