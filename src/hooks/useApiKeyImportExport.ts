import { useState } from 'react';
import { ApiKey } from '@/types/message';

export const useApiKeyImportExport = () => {
  const [isLoading, setIsLoading] = useState(false);

  const exportApiKeys = () => {
    try {
      const apiKeys = localStorage.getItem('apiKeys');
      if (!apiKeys) {
        return { success: false, message: '沒有可匯出的 API Key' };
      }

      const parsedKeys: ApiKey[] = JSON.parse(apiKeys);
      const exportData = {
        apiKeys: parsedKeys,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `api-keys-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      return { success: true, message: `成功匯出 ${parsedKeys.length} 個 API Key` };
    } catch (error) {
      return { success: false, message: '匯出失敗' };
    }
  };

  const importApiKeys = (file: File): Promise<{ success: boolean; message: string; count?: number }> => {
    return new Promise((resolve) => {
      setIsLoading(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          // 驗證資料格式
          if (!data.apiKeys || !Array.isArray(data.apiKeys)) {
            resolve({ success: false, message: '檔案格式不正確：缺少 apiKeys 陣列' });
            return;
          }

          // 驗證每個 API Key 的格式
          const validKeys: ApiKey[] = [];
          for (const key of data.apiKeys) {
            if (typeof key === 'object' && key.service && key.key) {
              validKeys.push({
                service: key.service,
                key: key.key,
                label: key.label || `${key.service} API Key`
              });
            }
          }

          if (validKeys.length === 0) {
            resolve({ success: false, message: '檔案中沒有有效的 API Key' });
            return;
          }

          // 讀取現有的 API Keys
          const existingKeys = localStorage.getItem('apiKeys');
          let currentKeys: ApiKey[] = [];
          if (existingKeys) {
            currentKeys = JSON.parse(existingKeys);
          }

          // 合併 API Keys（避免重複）
          const mergedKeys = [...currentKeys];
          let addedCount = 0;

          for (const newKey of validKeys) {
            const existingIndex = mergedKeys.findIndex(k => k.service === newKey.service);
            if (existingIndex >= 0) {
              // 更新現有的 API Key
              mergedKeys[existingIndex] = newKey;
            } else {
              // 添加新的 API Key
              mergedKeys.push(newKey);
              addedCount++;
            }
          }

          // 儲存更新後的 API Keys
          localStorage.setItem('apiKeys', JSON.stringify(mergedKeys));

          resolve({ 
            success: true, 
            message: `成功匯入 ${validKeys.length} 個 API Key（新增 ${addedCount} 個，更新 ${validKeys.length - addedCount} 個）`,
            count: validKeys.length
          });
        } catch (error) {
          resolve({ success: false, message: '檔案格式不正確：JSON 解析失敗' });
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setIsLoading(false);
        resolve({ success: false, message: '檔案讀取失敗' });
      };

      reader.readAsText(file);
    });
  };

  const validateApiKeyFile = (file: File): { valid: boolean; message: string } => {
    if (!file) {
      return { valid: false, message: '請選擇檔案' };
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, message: '檔案大小不能超過 5MB' };
    }

    const allowedTypes = ['application/json', 'text/json'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.json')) {
      return { valid: false, message: '只支援 JSON 格式檔案' };
    }

    return { valid: true, message: '檔案格式正確' };
  };

  const clearAllApiKeys = (): { success: boolean; message: string } => {
    try {
      localStorage.removeItem('apiKeys');
      return { success: true, message: '已清除所有 API Key' };
    } catch (error) {
      return { success: false, message: '清除失敗' };
    }
  };

  const getApiKeyStats = () => {
    try {
      // 檢查是否在客戶端環境
      if (typeof window === 'undefined') {
        return { total: 0, services: [] };
      }

      const apiKeys = localStorage.getItem('apiKeys');
      if (!apiKeys) {
        return { total: 0, services: [] };
      }

      const parsedKeys: ApiKey[] = JSON.parse(apiKeys);
      const services = parsedKeys.map(key => key.service);

      return {
        total: parsedKeys.length,
        services: services,
        lastModified: new Date().toISOString()
      };
    } catch {
      return { total: 0, services: [] };
    }
  };

  return {
    exportApiKeys,
    importApiKeys,
    validateApiKeyFile,
    clearAllApiKeys,
    getApiKeyStats,
    isLoading
  };
};