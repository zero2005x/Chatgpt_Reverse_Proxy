'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LoginStatus, PortalAccess } from '@/types/message';
import InlineChatBox from '@/components/InlineChatBox';
import NavigationHeader from '@/components/NavigationHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import Notification, { useNotification } from '@/components/Notification';
import ServiceStatusIndicator from '@/components/ServiceStatusIndicator';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://dgb01p240102.japaneast.cloudapp.azure.com');
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({ isLoggedIn: false, status: 'not_checked' });
  const [portalAccess, setPortalAccess] = useState<PortalAccess>({ hasAccess: false, status: 'not_checked' });
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { notifications, showSuccess, showError, removeNotification } = useNotification();

  const handleCheckLogin = async () => {
    if (!username || !password) {
      showError('輸入錯誤', '請輸入用戶名和密碼');
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
        body: JSON.stringify({ username, password, baseUrl }),
      });

      const data = await response.json();
      setLoginStatus(data);
      
      if (data.status === 'success') {
        showSuccess('登入成功', '用戶驗證通過');
      } else if (data.status === 'failed') {
        showError('登入失敗', data.message || '請檢查用戶名和密碼');
      }
    } catch (error) {
      const errorMessage = '檢查登入狀態時發生錯誤';
      setLoginStatus({ 
        isLoggedIn: false, 
        status: 'failed', 
        message: errorMessage 
      });
      showError('連接錯誤', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAccess = async () => {
    if (!username || !password) {
      showError('輸入錯誤', '請輸入用戶名和密碼');
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
        body: JSON.stringify({ username, password, baseUrl }),
      });

      const data = await response.json();
      setPortalAccess(data);
      
      if (data.status === 'success') {
        showSuccess('存取驗證成功', '已取得Portal存取權限');
      } else if (data.status === 'failed') {
        showError('存取驗證失敗', data.message || '無法取得Portal存取權限');
      }
    } catch (error) {
      const errorMessage = '檢查存取權限時發生錯誤';
      setPortalAccess({ 
        hasAccess: false, 
        status: 'failed', 
        message: errorMessage 
      });
      showError('連接錯誤', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader title="AI Chat 反向代理系統" />
      
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* 導航按鈕 */}
        <div className="flex justify-center space-x-4 mb-8">
          <Link
            href={`/chat${loginStatus.status === 'success' && portalAccess.status === 'success' ? 
              `?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&baseUrl=${encodeURIComponent(baseUrl)}&mode=original` : 
              ''}`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            開始聊天
            {loginStatus.status === 'success' && portalAccess.status === 'success' && (
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
        </div>

        {/* 登入狀態檢查 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            系統狀態檢查
          </h2>
          
          <div className="space-y-4">
            {/* 輸入表單 */}
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

            {/* 檢查按鈕 */}
            <div className="flex space-x-4">
              <button
                onClick={handleCheckLogin}
                disabled={isLoading}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading && <LoadingSpinner size="sm" text="" />}
                <span>檢查登入狀態</span>
              </button>
              
              <button
                onClick={handleCheckAccess}
                disabled={isLoading}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading && <LoadingSpinner size="sm" text="" />}
                <span>檢查存取權限</span>
              </button>
            </div>

            {/* 狀態顯示 */}
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

            {/* 資料列表 */}
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
        </div>

        {/* 功能說明 */}
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

      {/* 內嵌聊天對話框 */}
      <InlineChatBox
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        credentials={{
          username,
          password,
          baseUrl
        }}
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
    </div>
  );
}
