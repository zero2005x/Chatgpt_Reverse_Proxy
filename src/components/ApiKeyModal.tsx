import { useState } from 'react';
import { useApiKeys } from '@/hooks/useApiKeys';

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

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const { addApiKey, apiKeys } = useApiKeys();
  const [formData, setFormData] = useState({
    service: 'openai',
    key: '',
    label: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key.trim()) return;

    setIsSubmitting(true);
    try {
      const selectedService = Object.values(AI_SERVICES).flat().find(s => s.value === formData.service);
      
      addApiKey({
        service: formData.service as any,
        key: formData.key.trim(),
        label: formData.label.trim() || selectedService?.label || formData.service.toUpperCase()
      });

      // 重置表單
      setFormData({
        service: 'openai',
        key: '',
        label: ''
      });

      onClose();
    } catch (error) {
      console.error('新增 API Key 失敗:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">新增 API Key</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <input
              id="key"
              type="password"
              value={formData.key}
              onChange={(e) => handleInputChange('key', e.target.value)}
              placeholder="輸入您的 API Key"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!formData.key.trim() || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '新增中...' : '新增'}
            </button>
          </div>
        </form>

        {/* 已有的 API Keys */}
        {apiKeys.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">已設定的 API Keys</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {apiKeys.map((key, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{key.label}</p>
                    <p className="text-xs text-gray-500">{key.service}</p>
                  </div>
                  <span className="text-xs text-green-600">✓ 已設定</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}