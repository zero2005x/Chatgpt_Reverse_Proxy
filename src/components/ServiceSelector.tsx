import { useState } from 'react';
import { useApiKeys } from '@/hooks/useApiKeys';
import { LoginStatus, PortalAccess } from '@/types/message';
import ServiceStatusIndicator from './ServiceStatusIndicator';
import { HelpIcon } from './Tooltip';

interface ServiceSelectorProps {
  selectedService: string;
  onServiceChange: (service: string) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  serviceMode: 'original' | 'external';
  onServiceModeChange: (mode: 'original' | 'external') => void;
  // 原始服務的認證資訊
  originalServiceCredentials?: {
    username: string;
    password: string;
    baseUrl: string;
  };
  onOriginalServiceCredentialsChange?: (credentials: {
    username: string;
    password: string;
    baseUrl: string;
  }) => void;
  // 是否來自首頁認證（用於控制認證設定的顯示狀態）
  isFromHomepageAuth?: boolean;
}

const SERVICE_MODELS = {
  // OpenAI: 新增了 gpt-4o 和 gpt-4o-mini
  openai: [
    'gpt-4o', 
    'gpt-4o-mini',
    'gpt-4-turbo', 
    'gpt-3.5-turbo'
  ],

  // Google: 更新為最新的 Gemini 1.5 系列
  google: [
    'gemini-1.5-pro', 
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],

  // Mistral: 新增了 8x22B 和 Codestral 模型
  mistral: [
    'mistral-large-latest', 
    'open-mixtral-8x22b',
    'codestral-latest',
    'mistral-small-latest'
  ],
  
  // Cohere: 更新為 Command R 系列
  cohere: [
    'command-r-plus', 
    'command-r', 
    'command-light'
  ],

  // Groq: 更新為 Llama 3 和 Gemma，移除舊的 Llama 2
  groq: [
    'llama3-70b-8192', 
    'llama3-8b-8192', 
    'mixtral-8x7b-32768', 
    'gemma-7b-it'
  ],

  // Anthropic: 新增了最新的 Claude 3.5 Sonnet
  anthropic: [
    'claude-3.5-sonnet-20240620',
    'claude-3-opus-20240229', 
    'claude-3-sonnet-20240229', 
    'claude-3-haiku-20240307'
  ],

  // Azure: 擴充了模型列表以包含常用選項
  azure: [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-35-turbo',
    'gpt-35-turbo-16k'
  ],

  huggingface: ['microsoft/DialoGPT-medium', 'facebook/blenderbot-400M-distill'],
  xai: [
    'grok-4-0709',
    'grok-3',
    'grok-3-mini',
    'grok-3-fast-us-east-1',
    'grok-3-fast-eu-west-1',
    'grok-3-mini-fast',
    'grok-2-vision-1212-us-east-1',
    'grok-2-vision-1212-eu-west-1',
    'grok-2-image-1212'
  ]
};

export default function ServiceSelector({ 
  selectedService, 
  onServiceChange,
  selectedModel,
  onModelChange,
  serviceMode,
  onServiceModeChange,
  originalServiceCredentials,
  onOriginalServiceCredentialsChange,
  isFromHomepageAuth = false
}: ServiceSelectorProps) {
  const { getAvailableServices, getApiKeyByService } = useApiKeys();
  const [showAdvanced, setShowAdvanced] = useState(false);
  // 如果來自首頁認證，預設隱藏認證設定；否則顯示
  const [showCredentials, setShowCredentials] = useState(!isFromHomepageAuth);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({ isLoggedIn: false, status: 'not_checked' });
  const [portalAccess, setPortalAccess] = useState<PortalAccess>({ hasAccess: false, status: 'not_checked' });
  const [isLoading, setIsLoading] = useState(false);

  const availableServices = getAvailableServices();
  const hasApiKey = (service: string) => !!getApiKeyByService(service);

  const currentModels = SERVICE_MODELS[selectedService as keyof typeof SERVICE_MODELS] || [];

  const handleCredentialsChange = (field: 'username' | 'password' | 'baseUrl', value: string) => {
    if (onOriginalServiceCredentialsChange && originalServiceCredentials) {
      onOriginalServiceCredentialsChange({
        ...originalServiceCredentials,
        [field]: value
      });
    }
  };

  const handleCheckLogin = async () => {
    if (!originalServiceCredentials?.username || !originalServiceCredentials?.password) {
      alert('請先填寫用戶名和密碼');
      return;
    }

    setIsLoading(true);
    setLoginStatus({ isLoggedIn: false, status: 'pending' });

    try {
      const response = await fetch('/api/check-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: originalServiceCredentials.username,
          password: originalServiceCredentials.password,
          baseUrl: originalServiceCredentials.baseUrl
        }),
      });

      const data = await response.json();
      setLoginStatus(data);
    } catch {
      setLoginStatus({ 
        isLoggedIn: false, 
        status: 'failed', 
        message: '檢查登入狀態時發生錯誤' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAccess = async () => {
    if (!originalServiceCredentials?.username || !originalServiceCredentials?.password) {
      alert('請先填寫用戶名和密碼');
      return;
    }

    setIsLoading(true);
    setPortalAccess({ hasAccess: false, status: 'pending' });

    try {
      const response = await fetch('/api/check-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: originalServiceCredentials.username,
          password: originalServiceCredentials.password,
          baseUrl: originalServiceCredentials.baseUrl
        }),
      });

      const data = await response.json();
      setPortalAccess(data);
    } catch {
      setPortalAccess({ 
        hasAccess: false, 
        status: 'failed', 
        message: '檢查存取權限時發生錯誤' 
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="border-b border-gray-200 p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">AI 服務設定</h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showAdvanced ? '隱藏' : '顯示'}進階設定
        </button>
      </div>

      {/* 服務模式選擇 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          選擇服務模式
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="original"
              checked={serviceMode === 'original'}
              onChange={(e) => onServiceModeChange(e.target.value as 'original' | 'external')}
              className="mr-2"
            />
            <span className="text-sm">原始服務 (Portal)</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="external"
              checked={serviceMode === 'external'}
              onChange={(e) => onServiceModeChange(e.target.value as 'original' | 'external')}
              className="mr-2"
            />
            <span className="text-sm">外部 AI 服務</span>
          </label>
        </div>
      </div>

      {/* 原始服務認證 */}
      {serviceMode === 'original' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-blue-900">原始服務認證</h3>
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showCredentials ? '隱藏' : '顯示'}認證設定
            </button>
          </div>
          
          {showCredentials && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    服務器 URL
                  </label>
                  <input
                    type="text"
                    value={originalServiceCredentials?.baseUrl || ''}
                    onChange={(e) => handleCredentialsChange('baseUrl', e.target.value)}
                    placeholder="https://dgb01p240102.japaneast.cloudapp.azure.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用戶名
                  </label>
                  <input
                    type="text"
                    value={originalServiceCredentials?.username || ''}
                    onChange={(e) => handleCredentialsChange('username', e.target.value)}
                    placeholder="輸入用戶名"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密碼
                  </label>
                  <input
                    type="password"
                    value={originalServiceCredentials?.password || ''}
                    onChange={(e) => handleCredentialsChange('password', e.target.value)}
                    placeholder="輸入密碼"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* 檢查按鈕 */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={handleCheckLogin}
                  disabled={isLoading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isLoading ? '檢查中...' : '檢查登入狀態'}
                </button>
                
                <button
                  onClick={handleCheckAccess}
                  disabled={isLoading}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isLoading ? '檢查中...' : '檢查存取權限'}
                </button>
              </div>

              {/* 狀態顯示 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ServiceStatusIndicator
                  service="登入狀態"
                  status={loginStatus.status === 'success' ? 'ready' : 
                         loginStatus.status === 'pending' ? 'loading' : 
                         loginStatus.status === 'failed' ? 'error' : 'not-configured'}
                  message={loginStatus.message}
                />

                <ServiceStatusIndicator
                  service="Portal 存取"
                  status={portalAccess.status === 'success' ? 'ready' : 
                         portalAccess.status === 'pending' ? 'loading' : 
                         portalAccess.status === 'failed' ? 'error' : 'not-configured'}
                  message={portalAccess.message}
                />
              </div>

              {/* 資料列表 */}
              {portalAccess.status === 'success' && portalAccess.data && (
                <div className="mt-4 bg-white rounded-lg p-3 border border-gray-200">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm">Portal 資料</h4>
                  <div className="max-h-32 overflow-y-auto">
                    {Array.isArray(portalAccess.data) ? (
                      <ul className="space-y-1 text-xs text-gray-600">
                        {portalAccess.data.map((item, index) => (
                          <li key={index} className="border-b border-gray-100 pb-1">
                            {Array.isArray(item) ? item.join(' | ') : item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-600">無法顯示資料</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 外部 AI 服務選擇 */}
      {serviceMode === 'external' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 服務選擇 */}
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
              <span>選擇 AI 服務</span>
              <HelpIcon tooltip="選擇要使用的 AI 服務提供商，需要先在設定頁面添加對應的 API Key" />
            </label>
            <select
              value={selectedService}
              onChange={(e) => onServiceChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">請選擇服務</option>
              {availableServices.map((service) => (
                <option 
                  key={service.service} 
                  value={service.service}
                  disabled={!hasApiKey(service.service)}
                >
                  {service.label} {!hasApiKey(service.service) && '(需要API Key)'}
                </option>
              ))}
            </select>
            
            {/* 顯示所有可用服務的狀態 */}
            {availableServices.length > 0 && (
              <div className="mt-3 space-y-2">
                <h4 className="text-xs font-medium text-gray-500">服務狀態</h4>
                <div className="grid grid-cols-1 gap-2">
                  {availableServices.slice(0, 3).map((service) => (
                    <ServiceStatusIndicator
                      key={service.service}
                      service={service.label}
                      status={hasApiKey(service.service) ? 'ready' : 'not-configured'}
                      message={hasApiKey(service.service) ? '已設定 API Key' : '需要設定 API Key'}
                      className="text-xs"
                    />
                  ))}
                  {availableServices.length > 3 && (
                    <p className="text-xs text-gray-500">還有 {availableServices.length - 3} 個服務...</p>
                  )}
                </div>
              </div>
            )}
            
            {selectedService && !hasApiKey(selectedService) && (
              <p className="text-sm text-red-600 mt-1">
                請先在設定頁面添加此服務的 API Key
              </p>
            )}
          </div>

          {/* 模型選擇 */}
          {selectedService && currentModels.length > 0 && (
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span>選擇模型</span>
                <HelpIcon tooltip="選擇要使用的具體 AI 模型，不同模型有不同的能力和價格" />
              </label>
              <select
                value={selectedModel || ''}
                onChange={(e) => onModelChange?.(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">使用預設模型</option>
                {currentModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 進階設定 */}
      {showAdvanced && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">進階參數</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span>Temperature (創意度): {temperature}</span>
                <HelpIcon tooltip="控制 AI 回應的創意程度，數值越高越有創意，但可能不夠穩定" />
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>保守</span>
                <span>平衡</span>
                <span>創意</span>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span>最大 Token 數: {maxTokens}</span>
                <HelpIcon tooltip="限制 AI 回應的最大長度，數值越高回應越長，但會增加成本" />
              </label>
              <input
                type="range"
                min="100"
                max="4000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>100</span>
                <span>2000</span>
                <span>4000</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 服務狀態 */}
      {serviceMode === 'original' && originalServiceCredentials?.username && originalServiceCredentials?.password && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-green-800">
              原始服務 (Portal) 已準備就緒
            </span>
          </div>
        </div>
      )}
      
      {serviceMode === 'external' && selectedService && hasApiKey(selectedService) && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-green-800">
              {availableServices.find(s => s.service === selectedService)?.label} 已準備就緒
            </span>
          </div>
        </div>
      )}
    </div>
  );
}