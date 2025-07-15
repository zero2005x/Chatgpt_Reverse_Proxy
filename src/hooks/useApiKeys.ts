import { useState, useEffect } from 'react';
import { ApiKey } from '@/types/message';

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
        setApiKeys(JSON.parse(saved));
      }
    } catch (error) {
      console.error('載入 API Key 失敗:', error);
      setStatus('error');
    }
  };

  const saveApiKeys = (keys: ApiKey[]) => {
    try {
      localStorage.setItem('apiKeys', JSON.stringify(keys));
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

  const getApiKeyByService = (service: string) => {
    return apiKeys.find(key => key.service === service);
  };

  const getAvailableServices = () => {
    return apiKeys.map(key => ({
      service: key.service,
      label: key.label || key.service.toUpperCase()
    }));
  };

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