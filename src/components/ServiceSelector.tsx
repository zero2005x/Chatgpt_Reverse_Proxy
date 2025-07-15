import { useState, useEffect } from 'react';
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
  isFromHomepageAuth?: boolean;
  showOriginalService?: boolean;
  onShowOriginalServiceChange?: (show: boolean) => void;
}

const SERVICE_MODELS = {
  openai: [
    'gpt-4o', 
    'gpt-4o-mini',
    'gpt-4-turbo', 
    'gpt-3.5-turbo'
  ],
  google: [
    'gemini-1.5-pro', 
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ],
  mistral: [
    'mistral-large-latest', 
    'open-mixtral-8x22b',
    'codestral-latest',
    'mistral-small-latest'
  ],
  cohere: [
    'command-r-plus', 
    'command-r', 
    'command-light'
  ],
  groq: [
    'llama3-70b-8192', 
    'llama3-8b-8192', 
    'mixtral-8x7b-32768', 
    'gemma-7b-it'
  ],
  anthropic: [
    'claude-3.5-sonnet-20240620',
    'claude-3-opus-20240229', 
    'claude-3-sonnet-20240229', 
    'claude-3-haiku-20240307'
  ],
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
  isFromHomepageAuth = false,
  showOriginalService = false,
  onShowOriginalServiceChange
}: ServiceSelectorProps) {
  const { getAvailableServices, getApiKeyByService } = useApiKeys();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCredentials, setShowCredentials] = useState(!isFromHomepageAuth);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({ isLoggedIn: false, status: 'not_checked' });
  const [portalAccess, setPortalAccess] = useState<PortalAccess>({ hasAccess: false, status: 'not_checked' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isFromHomepageAuth && originalServiceCredentials?.username && originalServiceCredentials?.password) {
      setShowCredentials(false);
    }
  }, [isFromHomepageAuth, originalServiceCredentials]);

  const availableServices = getAvailableServices();
  const hasApiKey = (service: string) => Boolean(getApiKeyByService(service));

  const handleCredentialsChange = (field: string, value: string) => {
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          選擇服務模式
        </label>
        <div className="flex space-x-4">
          {showOriginalService && (
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
          )}
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
          {!showOriginalService && onShowOriginalServiceChange && (
            <button
              type="button"
              onClick={() => onShowOriginalServiceChange(true)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              顯示 Portal 服務選項
            </button>
          )}
        </div>
      </div>

      {serviceMode === 'original' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          {isFromHomepageAuth && originalServiceCredentials?.username && originalServiceCredentials?.password ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-800 font-medium">
                  已使用首頁驗證的認證信息
                </span>
              </div>
              <div className="mt-1 text-xs text-green-700">
                用戶: {originalServiceCredentials?.username} | 服務器: {originalServiceCredentials?.baseUrl}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-blue-900">
                  原始服務認證
                </h3>
                <button
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {showCredentials ? '隱藏認證設定' : '顯示認證設定'}
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
            </>
          )}
        </div>
      )}

      {serviceMode === 'external' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {selectedService && onModelChange && (
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span>選擇模型</span>
                <HelpIcon tooltip="選擇要使用的具體模型，不同模型有不同的能力和價格" />
              </label>
              <select
                value={selectedModel || ''}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedService}
              >
                <option value="">請選擇模型</option>
                {selectedService && SERVICE_MODELS[selectedService as keyof typeof SERVICE_MODELS]?.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {showAdvanced && serviceMode === 'external' && selectedService && hasApiKey(selectedService) && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">進階設定</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span>溫度 (Temperature)</span>
                <HelpIcon tooltip="控制回答的創造性，0-1之間，值越高越有創意但可能不太準確" />
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">目前值: {temperature}</div>
            </div>
            
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                <span>最大輸出長度</span>
                <HelpIcon tooltip="限制 AI 回答的最大字數，避免過長的回答" />
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
              <div className="text-xs text-gray-500 mt-1">目前值: {maxTokens} tokens</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
