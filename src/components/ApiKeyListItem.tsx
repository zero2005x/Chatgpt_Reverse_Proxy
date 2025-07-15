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

interface ApiKeyListItemProps {
  apiKey: ApiKey;
  index: number;
  onUpdate: (index: number, field: keyof ApiKey, value: string) => void;
  onRemove: (index: number) => void;
}

export default function ApiKeyListItem({ apiKey, index, onUpdate, onRemove }: ApiKeyListItemProps) {
  const getServiceLabel = (serviceValue: string) => {
    for (const category of Object.values(AI_SERVICES)) {
      const service = category.find(s => s.value === serviceValue);
      if (service) return service.label;
    }
    return serviceValue.toUpperCase();
  };

  const handleRemove = () => {
    if (window.confirm('確定要刪除這個 API Key 嗎？')) {
      onRemove(index);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">服務</label>
          <select
            value={apiKey.service}
            onChange={(e) => onUpdate(index, 'service', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">標籤</label>
          <input
            type="text"
            value={apiKey.label || ''}
            onChange={(e) => onUpdate(index, 'label', e.target.value)}
            placeholder={getServiceLabel(apiKey.service)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={apiKey.key}
            onChange={(e) => onUpdate(index, 'key', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleRemove}
            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm"
          >
            移除
          </button>
        </div>
      </div>
    </div>
  );
}