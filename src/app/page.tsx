'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InlineChatBox from '@/components/InlineChatBox';
import NavigationHeader from '@/components/NavigationHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import Notification, { useNotification } from '@/components/Notification';
import ServiceStatusIndicator from '@/components/ServiceStatusIndicator';
import { usePortalAuth } from '@/hooks/usePortalAuth';

export default function Home() {
  const {
    credentials,
    loginStatus,
    portalAccess,
    updateAuthStatus,
    clearPortalAuth,
    isAuthenticated,
  } = usePortalAuth();
  
  const [username, setUsername] = useState(credentials?.username || '');
  const [password, setPassword] = useState(credentials?.password || '');
  const [baseUrl, setBaseUrl] = useState(credentials?.baseUrl || 'https://dgb01p240102.japaneast.cloudapp.azure.com');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [shouldAutoRedirect, setShouldAutoRedirect] = useState(false);
  
  const router = useRouter();
  const { notifications, showSuccess, showError, removeNotification } = useNotification();

  // Effect for redirection - only when shouldAutoRedirect is true AND authentication is just completed
  useEffect(() => {
    if (shouldAutoRedirect && isAuthenticated()) {
      showSuccess('驗證成功', '即將跳轉到聊天頁面...');
      const timer = setTimeout(() => {
        router.push('/chat?mode=original');
        setShouldAutoRedirect(false); // Reset the flag after redirect
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoRedirect, isAuthenticated, router, showSuccess]);

  // Reset auto-redirect flag when component mounts to prevent unwanted redirects
  // Only disable auto-redirect if user manually navigates to homepage
  useEffect(() => {
    // Check if user navigated directly to homepage (not from a form submission)
    const urlParams = new URLSearchParams(window.location.search);
    const fromAuth = urlParams.get('fromAuth');
    
    // Always reset redirect flag on homepage visit unless it's from auth flow
    if (!fromAuth) {
      setShouldAutoRedirect(false);
    }
    
    // Also check if user is already authenticated but not from auth flow
    // This prevents redirect on subsequent homepage visits
    if (!fromAuth && isAuthenticated()) {
      setShouldAutoRedirect(false);
    }
  }, [isAuthenticated]);

  const handleCheckBoth = async () => {
    if (!username || !password) {
      showError('輸入錯誤', '請輸入用戶名和密碼');
      return;
    }

    setIsLoading(true);
    
    // Reset status before checking
    updateAuthStatus(
        { username, password, baseUrl },
        { isLoggedIn: false, status: 'pending' },
        { hasAccess: false, status: 'pending' }
    );

    try {
      const [loginResponse, accessResponse] = await Promise.all([
        fetch('/api/check-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, baseUrl }),
        }),
        fetch('/api/check-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, baseUrl }),
        })
      ]);

      const [loginData, accessData] = await Promise.all([
        loginResponse.json(),
        accessResponse.json()
      ]);

      // Update state atomically
      updateAuthStatus({ username, password, baseUrl }, loginData, accessData);

      if (loginData.status === 'failed' || accessData.status === 'failed') {
          if (loginData.status === 'failed') {
            showError('登入失敗', loginData.message || '請檢查用戶名和密碼');
          }
          if (accessData.status === 'failed') {
            showError('存取驗證失敗', accessData.message || '無法取得Portal存取權限');
          }
      } else if (loginData.status === 'success' && accessData.status === 'success') {
          // Only set auto-redirect when authentication is successful
          setShouldAutoRedirect(true);
      }

    } catch (error) {
      const errorMessage = '檢查登入狀態和存取權限時發生錯誤';
      updateAuthStatus(
          { username, password, baseUrl },
          { isLoggedIn: false, status: 'failed', message: errorMessage },
          { hasAccess: false, status: 'failed', message: errorMessage }
      );
      showError('連接錯誤', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isAuthenticatedStatus = isAuthenticated();

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="AI Chat 反向代理系統" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Navigation Buttons */}
        <div className="flex justify-center space-x-4 mb-8">
          <Link
            href="/chat"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            開始聊天
            {isAuthenticatedStatus && (
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">
                Portal 已驗證
              </span>
            )}
          </Link>
          <Link
            href="/settings"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            API Key 設定
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            格式說明
          </Link>
          {isAuthenticatedStatus && (
            <button
              onClick={clearPortalAuth}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              清除認證
            </button>
          )}
        </div>

        {/* System Status Check */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            系統狀態檢查
          </h2>
          
          {isAuthenticatedStatus ? (
            <div className="text-center py-8">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
                    <h3 className="text-lg font-medium text-green-800 mb-2">
                        ✅ 驗證成功
                    </h3>
                    <p className="text-green-700 mb-4">
                        您已成功登入並驗證存取權限
                    </p>
                    {shouldAutoRedirect ? (
                      <p className="text-green-600 text-sm">
                        即將跳轉到聊天頁面...
                      </p>
                    ) : (
                      <p className="text-green-600 text-sm">
                        您可以直接使用聊天功能
                      </p>
                    )}
                </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Input Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    服務器 URL
                  </label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用戶名
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="輸入用戶名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密碼
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="輸入密碼"
                  />
                </div>
              </div>

              {/* Check Button */}
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleCheckBoth}
                  disabled={isLoading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading && <LoadingSpinner size="sm" text="" />}
                  <span>驗證並登入 Portal</span>
                </button>
              </div>
            </div>
          )}

          {/* Status Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
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

          {/* Data List */}
          {portalAccess.status === 'success' && portalAccess.data && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Portal 資料</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                {Array.isArray(portalAccess.data) ? (
                  <ul className="space-y-1 text-sm text-gray-600">
                    {portalAccess.data.map((item, index) => (
                      <li key={index} className="border-b border-gray-200 pb-1">
                        {Array.isArray(item) ? item.join(' | ') : item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600">無法顯示資料</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Feature Description */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            功能說明
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">🤖 雙模式 AI 服務</h3>
              <p className="text-sm text-gray-600">
                支援原始Portal服務和外部AI服務(OpenAI、Google Gemini、Mistral、Cohere、Groq等)
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-2">💾 聊天紀錄管理</h3>
              <p className="text-sm text-gray-600">
                自動儲存聊天紀錄到瀏覽器本地，支援匯入/匯出功能
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-2">🔐 安全的API Key管理</h3>
              <p className="text-sm text-gray-600">
                API Key 安全儲存，所有請求透過後端處理，確保密鑰不外洩
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800 mb-2">📁 檔案格式支援</h3>
              <p className="text-sm text-gray-600">
                支援 JSON、CSV、XLSX 格式的聊天紀錄匯入和匯出
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Chat Box */}
      <InlineChatBox
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        credentials={credentials}
      />

      {/* Notification Container */}
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
    </div>
  );
}
