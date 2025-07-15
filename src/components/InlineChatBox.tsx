import { useState, useRef, useEffect } from 'react';
import { Message, LoginStatus, PortalAccess } from '@/types/message';
import { useApiKeys } from '@/hooks/useApiKeys';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface InlineChatBoxProps {
  isOpen: boolean;
  onToggle: () => void;
  credentials: {
    username: string;
    password: string;
    baseUrl: string;
  };
}

export default function InlineChatBox({ isOpen, onToggle, credentials }: InlineChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({ isLoggedIn: false, status: 'not_checked' });
  const [portalAccess, setPortalAccess] = useState<PortalAccess>({ hasAccess: false, status: 'not_checked' });
  const [serviceMode, setServiceMode] = useState<'portal' | 'api'>('portal');
  const [selectedService, setSelectedService] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getAvailableServices, getApiKeyByService } = useApiKeys();

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const availableServices = getAvailableServices();

  const checkPortalAuth = async () => {
    if (!credentials.username || !credentials.password) {
      setError('請先填寫用戶名和密碼');
      return false;
    }

    try {
      setIsLoading(true);
      
      // 檢查登入狀態
      const loginResponse = await fetch('/api/check-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          baseUrl: credentials.baseUrl
        }),
      }).catch(error => {
        console.error('Login check request failed:', error);
        throw new Error('無法連接到伺服器，請檢查網路連線');
      });
      
      const loginData = await loginResponse.json();
      setLoginStatus(loginData);
      
      if (loginData.status !== 'success') {
        setError('Portal 登入失敗，請檢查用戶名和密碼');
        return false;
      }

      // 檢查存取權限
      const accessResponse = await fetch('/api/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          baseUrl: credentials.baseUrl
        }),
      }).catch(error => {
        console.error('Access check request failed:', error);
        throw new Error('無法連接到伺服器，請檢查網路連線');
      });
      
      const accessData = await accessResponse.json();
      setPortalAccess(accessData);
      
      if (accessData.status !== 'success') {
        setError('Portal 存取權限驗證失敗');
        return false;
      }

      return true;
    } catch (err) {
      setError('認證檢查時發生錯誤');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const isPortalReady = () => {
    return loginStatus.status === 'success' && portalAccess.status === 'success';
  };

  const isApiReady = () => {
    return selectedService && getApiKeyByService(selectedService);
  };

  const showAuthRequiredModal = () => {
    setShowAuthModal(true);
  };

  const handleSendMessage = async (message: string) => {
    // 檢查是否有任何可用的認證方式
    if (serviceMode === 'portal') {
      if (!credentials.username || !credentials.password) {
        showAuthRequiredModal();
        return;
      }
      
      if (!isPortalReady()) {
        const authSuccess = await checkPortalAuth();
        if (!authSuccess) {
          showAuthRequiredModal();
          return;
        }
      }
    } else if (serviceMode === 'api') {
      if (!isApiReady()) {
        showAuthRequiredModal();
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // 添加用戶訊息
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      let response;
      let data;

      if (serviceMode === 'portal') {
        // 呼叫原始服務 API
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            username: credentials.username,
            password: credentials.password,
            id: '13'
          }),
        }).catch(error => {
          console.error('Portal chat request failed:', error);
          throw new Error('無法連接到 Portal 服務，請檢查網路連線');
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '請求失敗');
        }

        data = await response.json();

        // 添加AI回應
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          model: 'Portal AI'
        };
        setMessages(prev => [...prev, aiMessage]);

      } else if (serviceMode === 'api') {
        // 呼叫外部 AI API
        const apiKey = getApiKeyByService(selectedService);
        
        response = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            service: selectedService,
            apiKey: apiKey?.key,
            temperature: 0.7,
            maxTokens: 1000
          }),
        }).catch(error => {
          console.error('AI chat request failed:', error);
          throw new Error('無法連接到 AI 服務，請檢查網路連線');
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '請求失敗');
        }

        data = await response.json();

        // 添加AI回應
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toISOString(),
          model: data.model || selectedService
        };
        setMessages(prev => [...prev, aiMessage]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const canSendMessage = !isLoading && (
    (serviceMode === 'portal' && credentials.username && credentials.password) ||
    (serviceMode === 'api' && isApiReady())
  );

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* 切換按鈕 */}
      <button
        onClick={onToggle}
        className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* 聊天對話框 */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
          {/* 標題欄 */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
            <h3 className="font-semibold">AI 聊天</h3>
            <div className="flex items-center space-x-2 mt-1">
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  value="portal"
                  checked={serviceMode === 'portal'}
                  onChange={(e) => setServiceMode(e.target.value as 'portal' | 'api')}
                  className="mr-1"
                />
                Portal
              </label>
              <label className="flex items-center text-sm">
                <input
                  type="radio"
                  value="api"
                  checked={serviceMode === 'api'}
                  onChange={(e) => setServiceMode(e.target.value as 'portal' | 'api')}
                  className="mr-1"
                />
                API
              </label>
              {serviceMode === 'api' && (
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="text-black text-xs px-1 py-0.5 rounded"
                >
                  <option value="">選擇服務</option>
                  {availableServices.map(service => (
                    <option key={service.service} value={service.service}>
                      {service.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 聊天區域 */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>歡迎使用 Portal AI</p>
                <p className="text-sm mt-1">請輸入您的問題開始對話</p>
              </div>
            ) : (
              <div>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
              </div>
            )}
            
            {/* 錯誤訊息 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <div className="text-red-600 mr-2">⚠️</div>
                  <div className="text-red-800 text-sm">{error}</div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 輸入區域 */}
          <div className="border-t border-gray-200">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              disabled={!canSendMessage}
              placeholder={
                serviceMode === 'portal' 
                  ? (!credentials.username || !credentials.password ? "請先填寫用戶名和密碼" : "輸入您的訊息...")
                  : (!isApiReady() ? "請先設定 API Key" : "輸入您的訊息...")
              }
            />
          </div>
        </div>
      )}

      {/* 認證提醒 Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">需要認證</h3>
            <p className="text-gray-600 mb-6">
              請先完成以下任一認證方式才能使用聊天功能：
            </p>
            
            <div className="space-y-4">
              <div className="p-4 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Portal 服務</h4>
                <p className="text-sm text-gray-600 mb-2">
                  在主頁面填寫用戶名和密碼，並完成登入狀態和存取權限檢查
                </p>
                <div className="text-xs text-gray-500">
                  登入狀態: {loginStatus.status === 'success' ? '✅ 成功' : '❌ 未完成'}
                </div>
                <div className="text-xs text-gray-500">
                  存取權限: {portalAccess.status === 'success' ? '✅ 成功' : '❌ 未完成'}
                </div>
              </div>

              <div className="p-4 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">API Key 服務</h4>
                <p className="text-sm text-gray-600 mb-2">
                  在設定頁面添加至少一個 AI 服務的 API Key
                </p>
                <div className="text-xs text-gray-500">
                  可用服務: {availableServices.length > 0 ? `${availableServices.length} 個` : '無'}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  window.location.href = '/settings';
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                前往設定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}