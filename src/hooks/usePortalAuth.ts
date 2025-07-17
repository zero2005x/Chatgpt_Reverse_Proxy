'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LoginStatus, PortalAccess } from '@/types/message';
import { uiLogger } from '@/utils/logger';
import { ErrorHandler } from '@/utils/errorHandling';

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

// Enhanced encryption/decryption with better error handling
const encryptCredentials = (data: string): string => {
  const logger = uiLogger.child('encryptCredentials');
  
  try {
    // Use Base64 encoding for UTF-8 strings
    const encoded = btoa(unescape(encodeURIComponent(data)));
    
    // Simple XOR encryption on Base64 string
    const encrypted = encoded.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ 123)
    ).join('');
    
    // Base64 encode again
    return btoa(encrypted);
  } catch (error) {
    logger.error('加密失敗', error);
    // Fallback encryption
    try {
      return btoa(unescape(encodeURIComponent(data)));
    } catch (fallbackError) {
      logger.error('備用加密也失敗', fallbackError);
      return data; // Return original if all encryption fails
    }
  }
};

const decryptCredentials = (encryptedData: string): string => {
  const logger = uiLogger.child('decryptCredentials');
  
  try {
    // Try new decryption method
    const decoded = atob(encryptedData);
    const decrypted = decoded.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ 123)
    ).join('');
    
    // Decode UTF-8
    return decodeURIComponent(escape(atob(decrypted)));
  } catch (error) {
    logger.warn('新格式解密失敗，嘗試舊格式', { error: String(error) });
    try {
      // Fallback to old format
      return decodeURIComponent(escape(atob(encryptedData)));
    } catch (fallbackError) {
      logger.error('所有解密方法都失敗', fallbackError);
      return encryptedData; // Return original if all decryption fails
    }
  }
};

// 會話超時設定 (30 分鐘)
const SESSION_TIMEOUT = 30 * 60 * 1000;

export function usePortalAuth() {
  const logger = uiLogger.child('usePortalAuth');
  const [credentials, setCredentials] = useState<PortalCredentials | null>(null);
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({ isLoggedIn: false, status: 'not_checked' });
  const [portalAccess, setPortalAccess] = useState<PortalAccess>({ hasAccess: false, status: 'not_checked' });
  const [isFromHomepageAuth, setIsFromHomepageAuth] = useState(false);

  // Use refs to store current state values to avoid circular dependencies
  const stateRef = useRef({
    credentials: null as PortalCredentials | null,
    loginStatus: { isLoggedIn: false, status: 'not_checked' } as LoginStatus,
    portalAccess: { hasAccess: false, status: 'not_checked' } as PortalAccess,
    isFromHomepageAuth: false
  });

  // Update refs whenever state changes
  useEffect(() => {
    stateRef.current = { credentials, loginStatus, portalAccess, isFromHomepageAuth };
  }, [credentials, loginStatus, portalAccess, isFromHomepageAuth]);

  const clearPortalAuth = useCallback(() => {
    try {
      localStorage.removeItem('portalAuth');
      setCredentials(null);
      setLoginStatus({ isLoggedIn: false, status: 'not_checked' });
      setPortalAccess({ hasAccess: false, status: 'not_checked' });
      setIsFromHomepageAuth(false);
      logger.info('Portal 認證已清除');
    } catch (error) {
      logger.error('清除 Portal 認證失敗', error);
    }
  }, []); // Remove logger dependency to prevent circular dependencies

  const loadPortalAuth = useCallback(() => {
    try {
      const saved = localStorage.getItem('portalAuth');
      if (saved) {
        const decryptedData = decryptCredentials(saved);
        
        if (!decryptedData || decryptedData === saved) {
          console.warn('解密可能失敗，清除儲存的資料');
          // Inline clear logic to avoid circular dependency
          localStorage.removeItem('portalAuth');
          setCredentials(null);
          setLoginStatus({ isLoggedIn: false, status: 'not_checked' });
          setPortalAccess({ hasAccess: false, status: 'not_checked' });
          setIsFromHomepageAuth(false);
          return;
        }
        
        const parsedData: PortalAuthState = JSON.parse(decryptedData);
        
        if (!parsedData || typeof parsedData.timestamp !== 'number') {
          console.warn('儲存的資料結構不正確，清除資料');
          // Inline clear logic to avoid circular dependency
          localStorage.removeItem('portalAuth');
          setCredentials(null);
          setLoginStatus({ isLoggedIn: false, status: 'not_checked' });
          setPortalAccess({ hasAccess: false, status: 'not_checked' });
          setIsFromHomepageAuth(false);
          return;
        }
        
        const now = Date.now();
        if (now - parsedData.timestamp > SESSION_TIMEOUT) {
          // Inline clear logic to avoid circular dependency
          localStorage.removeItem('portalAuth');
          setCredentials(null);
          setLoginStatus({ isLoggedIn: false, status: 'not_checked' });
          setPortalAccess({ hasAccess: false, status: 'not_checked' });
          setIsFromHomepageAuth(false);
          return;
        }
        
        setCredentials(parsedData.credentials);
        setLoginStatus(parsedData.loginStatus);
        setPortalAccess(parsedData.portalAccess);
        setIsFromHomepageAuth(parsedData.isFromHomepageAuth);
      }
    } catch (error) {
      console.error('載入 Portal 認證失敗:', error);
      // Inline clear logic to avoid circular dependency
      localStorage.removeItem('portalAuth');
      setCredentials(null);
      setLoginStatus({ isLoggedIn: false, status: 'not_checked' });
      setPortalAccess({ hasAccess: false, status: 'not_checked' });
      setIsFromHomepageAuth(false);
    }
  }, []); // No dependencies to prevent circular dependencies

  useEffect(() => {
    loadPortalAuth();
  }, []); // Empty dependency array since loadPortalAuth is stable

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
  }, []); // Empty dependencies to prevent infinite loops

  const updateAuthStatus = useCallback((
    newCredentials: PortalCredentials,
    newLoginStatus: LoginStatus,
    newPortalAccess: PortalAccess,
  ) => {
    const isSuccess = newLoginStatus.status === 'success' && newPortalAccess.status === 'success';
    savePortalAuth(newCredentials, newLoginStatus, newPortalAccess, isSuccess);
  }, [savePortalAuth]);

  const updateCredentials = useCallback((newCredentials: PortalCredentials) => {
    const currentState = stateRef.current;
    savePortalAuth(newCredentials, currentState.loginStatus, currentState.portalAccess, currentState.isFromHomepageAuth);
  }, [savePortalAuth]);

  const updateLoginStatus = useCallback((newLoginStatus: LoginStatus) => {
    const currentState = stateRef.current;
    savePortalAuth(currentState.credentials, newLoginStatus, currentState.portalAccess, currentState.isFromHomepageAuth);
  }, [savePortalAuth]);

  const updatePortalAccess = useCallback((newPortalAccess: PortalAccess) => {
    const currentState = stateRef.current;
    savePortalAuth(currentState.credentials, currentState.loginStatus, newPortalAccess, currentState.isFromHomepageAuth);
  }, [savePortalAuth]);

  const updateIsFromHomepageAuth = useCallback((newIsFromHomepageAuth: boolean) => {
    const currentState = stateRef.current;
    savePortalAuth(currentState.credentials, currentState.loginStatus, currentState.portalAccess, newIsFromHomepageAuth);
  }, [savePortalAuth]);

  const consumeIsFromHomepageAuth = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.isFromHomepageAuth) {
      savePortalAuth(currentState.credentials, currentState.loginStatus, currentState.portalAccess, false);
    }
  }, [savePortalAuth]);

  const isAuthenticated = useCallback(() => {
    const currentState = stateRef.current;
    return !!(currentState.credentials && 
           currentState.credentials.username && 
           currentState.credentials.password && 
           currentState.loginStatus.status === 'success' && 
           currentState.portalAccess.status === 'success');
  }, []); // No dependencies to prevent infinite re-renders

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
    const currentState = stateRef.current;
    if (currentState.credentials) {
      // Update only the timestamp in localStorage without triggering state changes
      try {
        const authState: PortalAuthState = {
          credentials: currentState.credentials,
          loginStatus: currentState.loginStatus,
          portalAccess: currentState.portalAccess,
          isFromHomepageAuth: currentState.isFromHomepageAuth,
          timestamp: Date.now()
        };
        
        const encryptedData = encryptCredentials(JSON.stringify(authState));
        localStorage.setItem('portalAuth', encryptedData);
      } catch (error) {
        console.error('延長會話失敗:', error);
      }
    }
  }, []);

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
