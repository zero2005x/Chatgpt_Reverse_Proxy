'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoginStatus, PortalAccess } from '@/types/message';

interface PortalCredentials {
  username: string;
  password: string;
  baseUrl: string;
}

interface PortalAuthState {
  credentials: PortalCredentials | null;
  loginStatus: LoginStatus;
  portalAccess: PortalAccess;
  isFromHomepageAuth: boolean;
  timestamp: number;
}

// 簡單的加密/解密函數（用於客戶端儲存）- 支援 UTF-8
const encryptCredentials = (data: string): string => {
  try {
    // 使用 Base64 編碼 UTF-8 字符串
    const encoded = btoa(unescape(encodeURIComponent(data)));
    
    // 對 Base64 字符串進行簡單的 XOR 加密
    const encrypted = encoded.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ 123)
    ).join('');
    
    // 再次使用 Base64 編碼
    return btoa(encrypted);
  } catch (error) {
    console.error('加密失敗:', error);
    // 如果加密失敗，使用簡單的 Base64 編碼
    try {
      return btoa(unescape(encodeURIComponent(data)));
    } catch (fallbackError) {
      console.error('備用加密也失敗:', fallbackError);
      return data; // 最後返回原始值
    }
  }
};

const decryptCredentials = (encryptedData: string): string => {
  try {
    // 嘗試新的解密方法
    const decoded = atob(encryptedData);
    const decrypted = decoded.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ 123)
    ).join('');
    
    // 解碼 UTF-8
    return decodeURIComponent(escape(atob(decrypted)));
  } catch (error) {
    console.log('新格式解密失敗，嘗試舊格式:', error);
    try {
      // 嘗試舊格式（簡單的 Base64）
      return decodeURIComponent(escape(atob(encryptedData)));
    } catch (fallbackError) {
      console.error('所有解密方法都失敗:', fallbackError);
      return encryptedData; // 如果都失敗，返回原始值
    }
  }
};

// 會話超時設定 (30 分鐘)
const SESSION_TIMEOUT = 30 * 60 * 1000;

export function usePortalAuth() {
  const [credentials, setCredentials] = useState<PortalCredentials | null>(null);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({ isLoggedIn: false, status: 'not_checked' });
  const [portalAccess, setPortalAccess] = useState<PortalAccess>({ hasAccess: false, status: 'not_checked' });
  const [isFromHomepageAuth, setIsFromHomepageAuth] = useState(false);

  const clearPortalAuth = useCallback(() => {
    try {
      localStorage.removeItem('portalAuth');
      setCredentials(null);
      setLoginStatus({ isLoggedIn: false, status: 'not_checked' });
      setPortalAccess({ hasAccess: false, status: 'not_checked' });
      setIsFromHomepageAuth(false);
    } catch (error) {
      console.error('清除 Portal 認證失敗:', error);
    }
  }, []);

  const loadPortalAuth = useCallback(() => {
    try {
      const saved = localStorage.getItem('portalAuth');
      if (saved) {
        const decryptedData = decryptCredentials(saved);
        
        if (!decryptedData || decryptedData === saved) {
          console.warn('解密可能失敗，清除儲存的資料');
          clearPortalAuth();
          return;
        }
        
        const parsedData: PortalAuthState = JSON.parse(decryptedData);
        
        if (!parsedData || typeof parsedData.timestamp !== 'number') {
          console.warn('儲存的資料結構不正確，清除資料');
          clearPortalAuth();
          return;
        }
        
        const now = Date.now();
        if (now - parsedData.timestamp > SESSION_TIMEOUT) {
          clearPortalAuth();
          return;
        }
        
        setCredentials(parsedData.credentials);
        setLoginStatus(parsedData.loginStatus);
        setPortalAccess(parsedData.portalAccess);
        setIsFromHomepageAuth(parsedData.isFromHomepageAuth);
      }
    } catch (error) {
      console.error('載入 Portal 認證失敗:', error);
      clearPortalAuth();
    }
  }, [clearPortalAuth]);

  useEffect(() => {
    loadPortalAuth();
  }, [loadPortalAuth]);

  const savePortalAuth = useCallback((
    newCredentials: PortalCredentials | null,
    newLoginStatus: LoginStatus,
    newPortalAccess: PortalAccess,
    newIsFromHomepageAuth: boolean
  ) => {
    try {
      const authState: PortalAuthState = {
        credentials: newCredentials,
        loginStatus: newLoginStatus,
        portalAccess: newPortalAccess,
        isFromHomepageAuth: newIsFromHomepageAuth,
        timestamp: Date.now()
      };
      
      const encryptedData = encryptCredentials(JSON.stringify(authState));
      localStorage.setItem('portalAuth', encryptedData);
      
      // Update state directly without comparison to avoid infinite loops
      setCredentials(newCredentials);
      setLoginStatus(newLoginStatus);
      setPortalAccess(newPortalAccess);
      setIsFromHomepageAuth(newIsFromHomepageAuth);
    } catch (error) {
      console.error('儲存 Portal 認證失敗:', error);
    }
  }, []); // Remove dependencies to prevent infinite loops

  const updateAuthStatus = useCallback((
    newCredentials: PortalCredentials,
    newLoginStatus: LoginStatus,
    newPortalAccess: PortalAccess,
  ) => {
    const isSuccess = newLoginStatus.status === 'success' && newPortalAccess.status === 'success';
    savePortalAuth(newCredentials, newLoginStatus, newPortalAccess, isSuccess);
  }, [savePortalAuth]);

  const updateCredentials = useCallback((newCredentials: PortalCredentials) => {
    savePortalAuth(newCredentials, loginStatus, portalAccess, isFromHomepageAuth);
  }, [loginStatus, portalAccess, isFromHomepageAuth, savePortalAuth]);

  const updateLoginStatus = useCallback((newLoginStatus: LoginStatus) => {
    savePortalAuth(credentials, newLoginStatus, portalAccess, isFromHomepageAuth);
  }, [credentials, portalAccess, isFromHomepageAuth, savePortalAuth]);

  const updatePortalAccess = useCallback((newPortalAccess: PortalAccess) => {
    savePortalAuth(credentials, loginStatus, newPortalAccess, isFromHomepageAuth);
  }, [credentials, loginStatus, isFromHomepageAuth, savePortalAuth]);

  const updateIsFromHomepageAuth = useCallback((newIsFromHomepageAuth: boolean) => {
    savePortalAuth(credentials, loginStatus, portalAccess, newIsFromHomepageAuth);
  }, [credentials, loginStatus, portalAccess, savePortalAuth]);

  const consumeIsFromHomepageAuth = useCallback(() => {
    if (isFromHomepageAuth) {
      savePortalAuth(credentials, loginStatus, portalAccess, false);
    }
  }, [isFromHomepageAuth, credentials, loginStatus, portalAccess, savePortalAuth]);

  const isAuthenticated = useCallback(() => {
    return !!(credentials && 
           credentials.username && 
           credentials.password && 
           loginStatus.status === 'success' && 
           portalAccess.status === 'success');
  }, [credentials, loginStatus.status, portalAccess.status]);

  const isSessionExpiringSoon = () => {
    try {
      const saved = localStorage.getItem('portalAuth');
      if (saved) {
        const decryptedData = decryptCredentials(saved);
        const parsedData: PortalAuthState = JSON.parse(decryptedData);
        const now = Date.now();
        const timeLeft = SESSION_TIMEOUT - (now - parsedData.timestamp);
        return timeLeft < 5 * 60 * 1000; // 5分鐘
      }
    } catch (error) {
      console.error('檢查會話狀態失敗:', error);
    }
    return false;
  };

  const extendSession = useCallback(() => {
    if (credentials) {
      // Update only the timestamp in localStorage without triggering state changes
      try {
        const authState: PortalAuthState = {
          credentials,
          loginStatus,
          portalAccess,
          isFromHomepageAuth,
          timestamp: Date.now()
        };
        
        const encryptedData = encryptCredentials(JSON.stringify(authState));
        localStorage.setItem('portalAuth', encryptedData);
      } catch (error) {
        console.error('延長會話失敗:', error);
      }
    }
  }, [credentials, loginStatus, portalAccess, isFromHomepageAuth]);

  return {
    credentials,
    loginStatus,
    portalAccess,
    isFromHomepageAuth,
    updateCredentials,
    updateLoginStatus,
    updatePortalAccess,
    updateIsFromHomepageAuth,
    updateAuthStatus,
    consumeIsFromHomepageAuth,
    clearPortalAuth,
    isAuthenticated,
    isSessionExpiringSoon,
    extendSession,
    loadPortalAuth
  };
}
