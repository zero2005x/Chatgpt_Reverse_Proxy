'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useChatHistory } from '@/hooks/useChatHistory';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import ChatSidebar from '@/components/ChatSidebar';
import ServiceSelector from '@/components/ServiceSelector';
import ApiKeyModal from '@/components/ApiKeyModal';
import Link from 'next/link';
import Papa from 'papaparse';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [selectedService, setSelectedService] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  
  // 服務模式狀態
  const [serviceMode, setServiceMode] = useState<'original' | 'external'>('external');
  const [originalServiceCredentials, setOriginalServiceCredentials] = useState({
    username: '',
    password: '',
    baseUrl: 'https://dgb01p240102.japaneast.cloudapp.azure.com'
  });

  // 從 URL 參數載入認證信息
  const [isFromHomepageAuth, setIsFromHomepageAuth] = useState(false);
  
  useEffect(() => {
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const baseUrl = searchParams.get('baseUrl');
    const mode = searchParams.get('mode');
    
    if (username && password) {
      setOriginalServiceCredentials({
        username,
        password,
        baseUrl: baseUrl || 'https://dgb01p240102.japaneast.cloudapp.azure.com'
      });
      
      // 標記為來自首頁認證
      setIsFromHomepageAuth(true);
      
      // 如果 mode 參數為 original 或者有完整的認證信息，設定為原始模式
      if (mode === 'original' || (username && password && baseUrl)) {
        setServiceMode('original');
      }
    }
  }, [searchParams]);

  const { getApiKeyByService, getAvailableServices } = useApiKeys();
  const {
    sessions,
    currentSessionId,
    createNewSession,
    getCurrentSession,
    addMessage,
    setCurrentSessionId,
    deleteSession,
    renameSession,
    exportSessions,
    importSessions
  } = useChatHistory();

  const currentSession = getCurrentSession();
  const availableServices = getAvailableServices();

  // 自動滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 如果沒有當前對話，創建一個新的
  useEffect(() => {
    if (!currentSessionId && sessions.length === 0) {
      createNewSession();
    }
  }, [currentSessionId, sessions.length]);

  const handleSendMessage = async (message: string) => {
    if (serviceMode === 'original') {
      // 原始服務模式
      if (!originalServiceCredentials.username || !originalServiceCredentials.password) {
        setError('請先填寫原始服務的用戶名和密碼');
        return;
      }

      // 檢查 Portal 服務狀態
      try {
        setIsLoading(true);
        
        // 檢查登入狀態
        const loginResponse = await fetch('/api/check-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: originalServiceCredentials.username,
            password: originalServiceCredentials.password,
            baseUrl: originalServiceCredentials.baseUrl
          }),
        }).catch(error => {
          console.error('Login check request failed:', error);
          throw new Error('無法連接到伺服器，請檢查網路連線');
        });
        
        const loginData = await loginResponse.json();
        
        if (loginData.status !== 'success') {
          setError('Portal 登入失敗，請檢查用戶名和密碼');
          setIsLoading(false);
          return;
        }

        // 檢查存取權限
        const accessResponse = await fetch('/api/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: originalServiceCredentials.username,
            password: originalServiceCredentials.password,
            baseUrl: originalServiceCredentials.baseUrl
          }),
        }).catch(error => {
          console.error('Access check request failed:', error);
          throw new Error('無法連接到伺服器，請檢查網路連線');
        });
        
        const accessData = await accessResponse.json();
        
        if (accessData.status !== 'success') {
          setError('Portal 存取權限驗證失敗，請確認您有權限使用此服務');
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      } catch (err) {
        setError('Portal 服務驗證時發生錯誤');
        setIsLoading(false);
        return;
      }
    } else {
      // 外部服務模式
      if (!selectedService) {
        setError('請先選擇 AI 服務');
        return;
      }

      const apiKey = getApiKeyByService(selectedService);
      if (!apiKey) {
        setError('請先在設定頁面添加此服務的 API Key');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      // 添加用戶訊息
      addMessage({
        role: 'user',
        content: message
      });

      let response;
      let data;

      if (serviceMode === 'original') {
        // 呼叫原始服務 API
        response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            username: originalServiceCredentials.username,
            password: originalServiceCredentials.password,
            id: '13' // 預設使用 AI 模組 ID 13
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '請求失敗');
        }

        data = await response.json();

        // 添加AI回應
        addMessage({
          role: 'assistant',
          content: data.reply,
          model: 'Portal AI'
        });
      } else {
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
            model: selectedModel,
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
        addMessage({
          role: 'assistant',
          content: data.reply,
          model: data.model || selectedModel || 'default'
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportSessions = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'json') {
      // JSON 格式
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const importedCount = importSessions(data);
          alert(`成功匯入 ${importedCount} 個對話`);
        } catch (error) {
          alert('匯入失敗：JSON 格式不正確');
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'csv') {
      // CSV 格式
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          try {
            // 將 CSV 轉換為對話格式
            const sessions = results.data.map((row: any, index: number) => ({
              id: `imported-${index}`,
              name: row.name || `匯入的對話 ${index + 1}`,
              messages: [
                {
                  id: `msg-${index}-1`,
                  role: 'user' as const,
                  content: row.userMessage || '',
                  timestamp: new Date().toISOString()
                },
                {
                  id: `msg-${index}-2`,
                  role: 'assistant' as const,
                  content: row.assistantMessage || '',
                  timestamp: new Date().toISOString(),
                  model: row.model || 'unknown'
                }
              ].filter(msg => msg.content),
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString()
            }));

            const importedCount = importSessions(sessions);
            alert(`成功匯入 ${importedCount} 個對話`);
          } catch (error) {
            alert('匯入失敗：CSV 格式不正確');
          }
        }
      });
    } else {
      alert('不支援的檔案格式，請使用 JSON 或 CSV 格式');
    }
  };

  const handleExportSessions = () => {
    const exportData = exportSessions();
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `chat-sessions-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const canSendMessage = serviceMode === 'original' 
    ? originalServiceCredentials.username && originalServiceCredentials.password && !isLoading
    : selectedService && getApiKeyByService(selectedService) && !isLoading;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 側邊欄 */}
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={setCurrentSessionId}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onImportSessions={handleImportSessions}
        onExportSessions={handleExportSessions}
      />

      {/* 主要聊天區域 */}
      <div className="flex-1 flex flex-col">
        {/* 服務選擇器 */}
        <ServiceSelector
          selectedService={selectedService}
          onServiceChange={setSelectedService}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          serviceMode={serviceMode}
          onServiceModeChange={setServiceMode}
          originalServiceCredentials={originalServiceCredentials}
          onOriginalServiceCredentialsChange={setOriginalServiceCredentials}
          isFromHomepageAuth={isFromHomepageAuth}
        />

        {/* 導航按鈕 */}
        <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Link 
              href="/settings"
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              API 設定
            </Link>
            <Link 
              href="/"
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              回到首頁
            </Link>
            <Link 
              href="/docs"
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              格式說明
            </Link>
          </div>
          <div className="text-sm text-gray-600">
            {serviceMode === 'original' ? 'Portal 服務' : `外部服務: ${selectedService || '未選擇'}`}
          </div>
        </div>

        {/* 聊天訊息區域 */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          {/* 沒有設定的提示 */}
          {serviceMode === 'external' && availableServices.length === 0 && (
            <div className="text-center py-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">
                  尚未設定外部 AI 服務
                </h3>
                <p className="text-yellow-700 mb-4">
                  請先添加至少一個 AI 服務的 API Key，或選擇使用原始服務
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    快速設定 API Key
                  </button>
                  <Link 
                    href="/settings"
                    className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    前往設定頁面
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 原始服務未設定的提示 */}
          {serviceMode === 'original' && (!originalServiceCredentials.username || !originalServiceCredentials.password) && (
            <div className="text-center py-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                  請設定原始服務認證
                </h3>
                <p className="text-blue-700 mb-4">
                  請在上方填寫用戶名和密碼以使用原始 Portal 服務
                </p>
              </div>
            </div>
          )}

          {/* 聊天訊息 */}
          {currentSession && currentSession.messages.length > 0 && (
            <div className="max-w-4xl mx-auto">
              {currentSession.messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={index === currentSession.messages.length - 1}
                />
              ))}
            </div>
          )}

          {/* 空白狀態 */}
          {currentSession && currentSession.messages.length === 0 && canSendMessage && (
            <div className="text-center py-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-blue-800 mb-2">
                  開始新對話
                </h3>
                <p className="text-blue-700">
                  請在下方輸入您的問題，我會盡力為您解答
                </p>
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="max-w-4xl mx-auto mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-red-600 mr-2">⚠️</div>
                  <div className="text-red-800">{error}</div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 輸入區域 */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!canSendMessage}
          placeholder={
            serviceMode === 'original' 
              ? (!originalServiceCredentials.username || !originalServiceCredentials.password) 
                ? "請先填寫原始服務的用戶名和密碼" 
                : "輸入您的訊息... (Shift+Enter 換行)"
              : availableServices.length === 0
                ? "請先設定外部 AI 服務的 API Key"
                : !selectedService
                  ? "請先選擇 AI 服務"
                  : "輸入您的訊息... (Shift+Enter 換行)"
          }
        />
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">載入中...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}