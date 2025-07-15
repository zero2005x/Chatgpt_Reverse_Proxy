import { useState, useRef, useEffect, useCallback } from 'react';
import { useApiKeyImportExport } from '@/hooks/useApiKeyImportExport';
import Link from 'next/link';

export default function ApiKeyImportExport() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [stats, setStats] = useState<{ total: number; services: string[] }>({ total: 0, services: [] });
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    exportApiKeys, 
    importApiKeys, 
    validateApiKeyFile, 
    clearAllApiKeys, 
    getApiKeyStats, 
    isLoading 
  } = useApiKeyImportExport();

  // 使用 useCallback 避免依賴問題
  const updateStats = useCallback(() => {
    if (typeof window !== 'undefined') {
      setStats(getApiKeyStats());
    }
  }, [getApiKeyStats]);

  // 確保只在客戶端渲染時載入統計資料
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      setStats(getApiKeyStats());
    }
  }, [getApiKeyStats]);

  // 當有訊息更新時，重新載入統計資料
  useEffect(() => {
    if (isClient && message?.type === 'success') {
      updateStats();
    }
  }, [message, isClient, updateStats]);

  const handleExport = () => {
    const result = exportApiKeys();
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateApiKeyFile(file);
    if (!validation.valid) {
      setMessage({
        type: 'error',
        text: validation.message
      });
      return;
    }

    const result = await importApiKeys(file);
    setMessage({
      type: result.success ? 'success' : 'error',
      text: result.message
    });

    // 清除檔案選擇
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    const confirmed = window.confirm('確定要清除所有 API Key 嗎？此操作無法復原。');
    if (confirmed) {
      const result = clearAllApiKeys();
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
    }
  };

  const dismissMessage = () => {
    setMessage(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        API Key 匯入匯出
      </h2>

      {/* 統計資訊 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-2">目前狀態</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {isClient ? stats.total : 0}
            </div>
            <div className="text-sm text-gray-600">API Keys</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {isClient ? stats.services.length : 0}
            </div>
            <div className="text-sm text-gray-600">服務類型</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">
              {isClient && stats.services.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-center">
                  {stats.services.map(service => (
                    <span key={service} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {service}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">無服務</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 操作按鈕 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 匯出 */}
        <div className="text-center">
          <button
            onClick={handleExport}
            disabled={!isClient || stats.total === 0}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            📤 匯出 API Keys
          </button>
          <p className="text-xs text-gray-500 mt-1">
            將所有 API Key 匯出為 JSON 檔案
          </p>
        </div>

        {/* 匯入 */}
        <div className="text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-file"
          />
          <label
            htmlFor="import-file"
            className="w-full inline-block px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer transition-colors"
          >
            📥 匯入 API Keys
          </label>
          <p className="text-xs text-gray-500 mt-1">
            從 JSON 檔案匯入 API Key
          </p>
        </div>

        {/* 清除 */}
        <div className="text-center">
          <button
            onClick={handleClearAll}
            disabled={!isClient || stats.total === 0}
            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            🗑️ 清除所有
          </button>
          <p className="text-xs text-gray-500 mt-1">
            刪除所有已儲存的 API Key
          </p>
        </div>
      </div>

      {/* 載入狀態 */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">處理中...</span>
          </div>
        </div>
      )}

      {/* 訊息顯示 */}
      {message && (
        <div className={`p-4 rounded-lg mb-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`mr-2 ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {message.type === 'success' ? '✅' : '❌'}
              </div>
              <div className={`text-sm ${
                message.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {message.text}
              </div>
            </div>
            <button
              onClick={dismissMessage}
              className={`text-sm hover:opacity-75 ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 說明文字 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">使用說明</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 匯出功能會將所有 API Key 以 JSON 格式儲存</li>
          <li>• 匯入功能支援標準 JSON 格式的 API Key 檔案</li>
          <li>• 匯入時會自動合併，相同服務的 API Key 會被更新</li>
          <li>• 所有資料都儲存在瀏覽器本地，不會上傳到伺服器</li>
          <li>• 
            <Link href="/docs" className="text-blue-600 hover:underline">
              查看詳細格式說明
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}