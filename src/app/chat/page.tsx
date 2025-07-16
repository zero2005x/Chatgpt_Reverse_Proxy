'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Message } from '@/types/message';
import { useApiKeys } from '@/hooks/useApiKeys';
import { useChatContext } from '@/contexts/ChatContext';
import { usePortalAuth } from '@/hooks/usePortalAuth';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import ChatSidebar from '@/components/ChatSidebar';
import ServiceSelector from '@/components/ServiceSelector';
import ApiKeyModal from '@/components/ApiKeyModal';
import Link from 'next/link';
import Papa from 'papaparse';
import NavigationHeader from '@/components/NavigationHeader';
import Notification, { useNotification } from '@/components/Notification';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [selectedService, setSelectedService] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 手機版側邊欄狀態
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false); // 追蹤使用者是否已發送訊息
  const { notifications, showSuccess, showError, removeNotification } = useNotification();
  
  // 使用 Portal 認證 hook
  const {
    credentials,
    loginStatus,
    portalAccess,
    isFromHomepageAuth,
    updateCredentials,
    extendSession,
    consumeIsFromHomepageAuth
  } = usePortalAuth();
  
  // 服務模式狀態 - 預設使用外部服務，只有當明確從認證頁面跳轉時才顯示原始服務
  const [serviceMode, setServiceMode] = useState<'original' | 'external'>('external');
  const [showOriginalService, setShowOriginalService] = useState(false);
  const [showMobileServiceSelector, setShowMobileServiceSelector] = useState(false);
  const [isServiceModeManuallySet, setIsServiceModeManuallySet] = useState(false); // 追蹤是否手動設定服務模式
  const [originalServiceCredentials, setOriginalServiceCredentials] = useState({
    username: credentials?.username || '',
    password: credentials?.password || '',
    baseUrl: credentials?.baseUrl || 'https://dgb01p240102.japaneast.cloudapp.azure.com'
  });

  // 初始化時設定服務模式 - 只在首次載入時執行，避免覆蓋用戶手動選擇
  useEffect(() => {
    // 如果已經手動設定過服務模式，就不再自動調整
    if (isServiceModeManuallySet) {
      return;
    }

    const mode = searchParams.get('mode');
    
    // 如果有持久化的認證信息，使用它
    if (credentials) {
      setOriginalServiceCredentials(prev => ({
        ...prev,
        username: credentials.username,
        password: credentials.password,
        baseUrl: credentials.baseUrl
      }));
    }
    
    // 檢查是否應該顯示並使用原始服務
    const shouldShowOriginal = mode === 'original' || 
      (isFromHomepageAuth && loginStatus.status === 'success' && portalAccess.status === 'success');
    
    // 檢查是否有完整的認證信息且已成功驗證
    const hasValidCredentials = credentials && 
        credentials.username && 
        credentials.password && 
        loginStatus.status === 'success' && 
        portalAccess.status === 'success';
    
    if (shouldShowOriginal || hasValidCredentials) {
      setServiceMode('original');
      setShowOriginalService(true);
      console.log('Auto-set service mode to original due to valid credentials or homepage auth');
    } else {
      // 如果有認證信息但未完全驗證，仍然顯示原始服務選項但不自動選擇
      if (credentials && credentials.username && credentials.password) {
        setShowOriginalService(true);
      }
      // 只有在沒有任何認證信息時才設定為外部服務
      if (!credentials || (!credentials.username && !credentials.password)) {
        setServiceMode('external');
        console.log('Auto-set service mode to external due to no credentials');
      }
    }

    // 重置標記，這樣重新整理頁面時不會再次觸發
    consumeIsFromHomepageAuth();
  }, [searchParams, isFromHomepageAuth, consumeIsFromHomepageAuth]); // 移除 credentials 等依賴，避免重複觸發

  // 單獨處理認證信息的更新，不影響服務模式選擇
  useEffect(() => {
    if (credentials) {
      setOriginalServiceCredentials(prev => ({
        ...prev,
        username: credentials.username,
        password: credentials.password,
        baseUrl: credentials.baseUrl
      }));
      // 顯示原始服務選項，但不自動切換模式
      setShowOriginalService(true);
    }
  }, [credentials]);

  // 處理服務模式手動切換的包裝函數
  const handleServiceModeChange = useCallback((newMode: 'original' | 'external') => {
    console.log('Service mode manually changed to:', newMode);
    setServiceMode(newMode);
    setIsServiceModeManuallySet(true); // 標記為手動設定
  }, []);

  // 當認證狀態發生變化時，只有在用戶沒有手動設定的情況下才自動調整服務模式
  useEffect(() => {
    if (isServiceModeManuallySet) {
      console.log('Service mode is manually set, skipping auto-adjustment');
      return;
    }

    // 如果認證成功且當前是外部服務模式，可以提示用戶切換到 Portal 服務
    if (loginStatus.status === 'success' && 
        portalAccess.status === 'success' && 
        serviceMode === 'external' &&
        originalServiceCredentials.username &&
        originalServiceCredentials.password) {
      console.log('Authentication successful, but service mode is external and was not manually set');
      // 這裡可以選擇是否自動切換，或只是確保顯示 Portal 服務選項
      setShowOriginalService(true);
    }
  }, [loginStatus.status, portalAccess.status, serviceMode, originalServiceCredentials.username, originalServiceCredentials.password, isServiceModeManuallySet]);

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
  } = useChatContext();

  const currentSession = getCurrentSession();
  const availableServices = getAvailableServices();

  // 自動滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  // 用戶活動檢測，自動延長會話
  useEffect(() => {
    const handleUserActivity = () => {
      if (credentials && 
          credentials.username && 
          credentials.password && 
          loginStatus.status === 'success' && 
          portalAccess.status === 'success') {
        extendSession();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [credentials, loginStatus.status, portalAccess.status, extendSession]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 如果沒有當前對話，創建一個新的
  useEffect(() => {
    if (!currentSessionId && sessions.length === 0) {
      createNewSession();
    }
  }, []); // 移除所有依賴，只在組件初始化時執行一次

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
        showError('服務未選擇', '請先選擇 AI 服務');
        return;
      }

      const apiKey = getApiKeyByService(selectedService);
      if (!apiKey) {
        showError('API Key 未設定', '請先在設定頁面添加此服務的 API Key');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    
    // 標記用戶已發送訊息
    if (!hasUserSentMessage) {
      setHasUserSentMessage(true);
    }

    // 先添加用戶訊息
    const userMessage = addMessage({
      role: 'user',
      content: message
    });

    // 確保滾動到底部
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
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
        const aiMessage = addMessage({
          role: 'assistant',
          content: data.reply,
          model: 'Portal AI'
        });

        // 確保滾動到底部
        setTimeout(() => {
          scrollToBottom();
        }, 100);
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
        const aiMessage = addMessage({
          role: 'assistant',
          content: data.reply,
          model: data.model || selectedModel || 'default'
        });

        // 確保滾動到底部
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '發生未知錯誤';
      setError(errorMessage);
      showError('發送失敗', errorMessage);
      
      // 如果發生錯誤，用戶訊息已經被添加，不需要移除，只需要顯示錯誤
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
          showSuccess('匯入成功', `成功匯入 ${importedCount} 個對話`);
        } catch (error) {
          showError('匯入失敗', 'JSON 格式不正確');
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
            showSuccess('匯入成功', `成功匯入 ${importedCount} 個對話`);
          } catch (error) {
            showError('匯入失敗', 'CSV 格式不正確');
          }
        }
      });
    } else {
      showError('格式不支援', '不支援的檔案格式，請使用 JSON 或 CSV 格式');
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
    
    showSuccess('匯出成功', '聊天記錄已成功匯出');
  };

  const canSendMessage = serviceMode === 'original' 
    ? originalServiceCredentials.username && originalServiceCredentials.password && !isLoading
    : selectedService && getApiKeyByService(selectedService) && !isLoading;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <NavigationHeader title="AI 聊天" />
      
      {/* 會話狀態提示 - 只在非首頁認證時顯示 */}
      {!isFromHomepageAuth && 
       credentials && 
       credentials.username && 
       credentials.password && 
       loginStatus.status === 'success' && 
       portalAccess.status === 'success' && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-800">Portal 認證已激活</span>
            </div>
            <div className="text-xs text-green-700 hidden sm:block">
              用戶: {credentials?.username} | 30分鐘會話
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* 手機版側邊欄背景遮罩 */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 xl:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* 側邊欄 - 在手機和平板上可切換 */}
        <div className={`
          fixed xl:relative inset-y-0 left-0 z-40 xl:z-auto
          transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} xl:translate-x-0
          transition-transform duration-300 ease-in-out xl:transition-none
          ${isSidebarOpen ? 'block' : 'hidden'} xl:block
        `}>
          <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={(sessionId) => {
            setCurrentSessionId(sessionId);
            setIsSidebarOpen(false); // 選擇會話後關閉手機版側邊欄
          }}
          onNewSession={() => {
            createNewSession();
            setIsSidebarOpen(false); // 創建新會話後關閉手機版側邊欄
          }}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          onImportSessions={handleImportSessions}
          onExportSessions={handleExportSessions}
        />
        </div>

        {/* 主要聊天區域 */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* 服務選擇器 - 在手機上隱藏或壓縮 */}
          <div className="flex-shrink-0 hidden sm:block">
            <ServiceSelector
              selectedService={selectedService}
              onServiceChange={setSelectedService}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              serviceMode={serviceMode}
              onServiceModeChange={handleServiceModeChange}
              originalServiceCredentials={originalServiceCredentials}
              onOriginalServiceCredentialsChange={(newCredentials) => {
                setOriginalServiceCredentials(newCredentials);
                updateCredentials(newCredentials);
              }}
              isFromHomepageAuth={isFromHomepageAuth}
              showOriginalService={showOriginalService}
              onShowOriginalServiceChange={setShowOriginalService}
              hideAuthAfterSuccess={hasUserSentMessage && !isFromHomepageAuth}
            />
          </div>

          {/* 狀態資訊列 - 在手機上簡化 */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 sm:px-4 py-1 sm:py-2 bg-gray-50 border-b border-gray-200 gap-1 sm:gap-2">
            <div className="text-xs sm:text-sm text-gray-600">
              {serviceMode === 'original' ? 'Portal 服務' : `外部服務: ${selectedService || '未選擇'}`}
            </div>
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {/* 手機版側邊欄切換按鈕 */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="xl:hidden px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center space-x-1"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="hidden sm:inline">會話</span>
              </button>
              
              {/* 手機版新增對話按鈕 */}
              <button
                onClick={() => createNewSession()}
                className="xl:hidden px-2 sm:px-3 py-1 sm:py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                新對話
              </button>
              
              {/* 手機版服務切換按鈕 */}
              <button
                onClick={() => setShowMobileServiceSelector(true)}
                className="sm:hidden px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                設定
              </button>
              
              <Link 
                href="/settings"
                className="hidden sm:inline-block px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                API 設定
              </Link>
              <Link 
                href="/docs"
                className="hidden sm:inline-block px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                格式說明
              </Link>
            </div>
          </div>

          {/* 聊天訊息區域 */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 bg-white min-h-0 space-y-2">
          {/* 沒有設定的提示 */}
          {serviceMode === 'external' && availableServices.length === 0 && (
            <div className="text-center py-4 sm:py-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 max-w-2xl mx-auto">
                <h3 className="text-base sm:text-lg font-medium text-yellow-800 mb-2">
                  尚未設定外部 AI 服務
                </h3>
                <p className="text-sm sm:text-base text-yellow-700 mb-4">
                  請先添加至少一個 AI 服務的 API Key，或選擇使用原始服務
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => setIsApiKeyModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    快速設定 API Key
                  </button>
                  <Link 
                    href="/settings"
                    className="inline-block px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm text-center"
                  >
                    前往設定頁面
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 原始服務未設定的提示 */}
          {serviceMode === 'original' && (!originalServiceCredentials.username || !originalServiceCredentials.password) && (
            <div className="text-center py-4 sm:py-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 max-w-2xl mx-auto">
                <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2">
                  請設定原始服務認證
                </h3>
                <p className="text-sm sm:text-base text-blue-700 mb-4">
                  請在上方填寫用戶名和密碼以使用原始 Portal 服務
                </p>
              </div>
            </div>
          )}

          {/* 聊天訊息 */}
          {currentSession && currentSession.messages.length > 0 && (
            <div className="w-full max-w-none px-1 sm:px-2 lg:px-4">
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
            <div className="text-center py-4 sm:py-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 max-w-2xl mx-auto">
                <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2">
                  開始新對話
                </h3>
                <p className="text-sm sm:text-base text-blue-700">
                  請在下方輸入您的問題，我會盡力為您解答
                </p>
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 mb-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-2xl mx-auto">
                <div className="flex items-center">
                  <div className="text-red-600 mr-2">⚠️</div>
                  <div className="text-red-800 text-sm flex-1">{error}</div>
                  <button
                    onClick={() => setError(null)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

            <div ref={messagesEndRef} />
          </div>

          {/* 輸入區域 - 在手機上優化間距 */}
          <div className="flex-shrink-0 border-t border-gray-200 p-1 sm:p-0">
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              disabled={!canSendMessage}
              placeholder={
                serviceMode === 'original' 
                  ? (!originalServiceCredentials.username || !originalServiceCredentials.password) 
                    ? "請先在上方填寫用戶名和密碼，然後開始對話" 
                    : "請輸入您的問題... (Shift+Enter 換行)"
                  : availableServices.length === 0
                    ? "請先設定外部 AI 服務的 API Key 才能開始對話"
                    : !selectedService
                      ? "請先選擇 AI 服務，然後開始對話"
                      : "請輸入您的問題... (Shift+Enter 換行)"
              }
            />
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* 通知容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            type={notification.type}
            title={notification.title}
            message={notification.message}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>

      {/* 手機版服務選擇器彈窗 */}
      {showMobileServiceSelector && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileServiceSelector(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">服務設定</h3>
              <button
                onClick={() => setShowMobileServiceSelector(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-0">
              <ServiceSelector
                selectedService={selectedService}
                onServiceChange={setSelectedService}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                serviceMode={serviceMode}
                onServiceModeChange={handleServiceModeChange}
                originalServiceCredentials={originalServiceCredentials}
                onOriginalServiceCredentialsChange={(newCredentials) => {
                  setOriginalServiceCredentials(newCredentials);
                  updateCredentials(newCredentials);
                }}
                isFromHomepageAuth={isFromHomepageAuth}
                showOriginalService={showOriginalService}
                onShowOriginalServiceChange={setShowOriginalService}
                hideAuthAfterSuccess={hasUserSentMessage && !isFromHomepageAuth}
              />
            </div>
          </div>
        </div>
      )}
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