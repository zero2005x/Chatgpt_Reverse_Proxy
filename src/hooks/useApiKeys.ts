import { useState, useEffect, useCallback } from 'react';
import { ApiKey } from '@/types/message';

// 簡單的加密/解密函數（用於客戶端儲存）
const encryptApiKey = (key: string): string => {
  const encrypted = btoa(key.split('').map(char => 
    String.fromCharCode(char.charCodeAt(0) ^ 123)
  ).join(''));
  return encrypted;
};

const decryptApiKey = (encryptedKey: string): string => {
  try {
    const decoded = atob(encryptedKey);
    return decoded.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ 123)
    ).join('');
  } catch {
    return encryptedKey; // 如果解密失敗，返回原始值（向後兼容）
  }
};

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 載入 API Keys
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = () => {
    try {
      const saved = localStorage.getItem('apiKeys');
      if (saved) {
        const parsedKeys = JSON.parse(saved);
        // 解密 API Keys
        const decryptedKeys = parsedKeys.map((key: ApiKey) => ({
          ...key,
          key: decryptApiKey(key.key)
        }));
        setApiKeys(decryptedKeys);
      }
    } catch (error) {
      console.error('載入 API Key 失敗:', error);
      setStatus('error');
    }
  };

  const saveApiKeys = (keys: ApiKey[]) => {
    try {
      // 加密 API Keys 再儲存
      const encryptedKeys = keys.map(key => ({
        ...key,
        key: encryptApiKey(key.key)
      }));
      localStorage.setItem('apiKeys', JSON.stringify(encryptedKeys));
      setApiKeys(keys);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('儲存 API Key 失敗:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const addApiKey = (newApiKey: Omit<ApiKey, 'id'>) => {
    setStatus('saving');
    const updatedKeys = [...apiKeys, newApiKey];
    saveApiKeys(updatedKeys);
  };

  const updateApiKey = (index: number, field: keyof ApiKey, value: string) => {
    setStatus('saving');
    const updatedKeys = apiKeys.map((key, i) => 
      i === index ? { ...key, [field]: value } : key
    );
    saveApiKeys(updatedKeys);
  };

  const removeApiKey = (index: number) => {
    setStatus('saving');
    const updatedKeys = apiKeys.filter((_, i) => i !== index);
    saveApiKeys(updatedKeys);
  };

  const getApiKeyByService = useCallback((service: string) => {
    return apiKeys.find(key => key.service === service);
  }, [apiKeys]);

  const getAvailableServices = useCallback(() => {
    return apiKeys.map(key => ({
      service: key.service,
      label: key.label || key.service.toUpperCase()
    }));
  }, [apiKeys]);

  return {
    apiKeys,
    status,
    addApiKey,
    updateApiKey,
    removeApiKey,
    getApiKeyByService,
    getAvailableServices,
    loadApiKeys
  };
}