import { useState, useEffect, useCallback } from 'react';
import { Message, ChatSession } from '@/types/message';
import { v4 as uuidv4 } from 'uuid';
import { chatLogger } from '@/utils/logger';
import { ErrorHandler, withErrorBoundary } from '@/utils/errorHandling';

export function useChatHistory() {
  const logger = chatLogger.child('useChatHistory');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Enhanced session ID update with error handling
  const updateCurrentSessionId = useCallback((sessionId: string | null) => {
    try {
      logger.debug('更新當前會話 ID', { sessionId });
      setCurrentSessionId(sessionId);
      
      if (sessionId) {
        localStorage.setItem('currentSessionId', sessionId);
      } else {
        localStorage.removeItem('currentSessionId');
      }
    } catch (error) {
      logger.error('更新會話 ID 失敗', error, { sessionId });
    }
  }, [logger]);

  const loadSessions = useCallback(() => {
    if (typeof window === 'undefined') return; // SSR check
    
    try {
      logger.debug('載入聊天會話');
      setIsLoading(true);
      
      const savedSessions = localStorage.getItem('chatSessions');
      const savedCurrentSessionId = localStorage.getItem('currentSessionId');
      
      logger.debug('載入會話資料', {
        hasSavedSessions: !!savedSessions,
        savedCurrentSessionId,
        savedSessionsLength: savedSessions ? JSON.parse(savedSessions).length : 0,
        timestamp: new Date().toISOString()
      });
      
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        
        // 驗證數據完整性
        const validSessions = parsed.filter((session: any) => 
          session && 
          typeof session === 'object' && 
          session.id && 
          session.name && 
          Array.isArray(session.messages)
        );
        
        // 去除重複的 session ID，保留最新的
        const uniqueSessions = validSessions.reduce((acc: any[], session: any) => {
          const existingIndex = acc.findIndex((s: any) => s.id === session.id);
          if (existingIndex >= 0) {
            // 如果已存在，比較時間戳，保留較新的
            const existing = acc[existingIndex];
            const sessionTime = new Date(session.lastModified || session.createdAt || 0).getTime();
            const existingTime = new Date(existing.lastModified || existing.createdAt || 0).getTime();
            if (sessionTime > existingTime) {
              acc[existingIndex] = session;
            }
          } else {
            acc.push(session);
          }
          return acc;
        }, []);
        
        if (uniqueSessions.length > 0) {
          logger.info('找到有效會話，更新狀態', {
            count: uniqueSessions.length,
            totalMessages: uniqueSessions.reduce((total: number, s: any) => total + s.messages.length, 0),
            savedCurrentId: savedCurrentSessionId
          });

          // Update sessions state immediately
          setSessions(uniqueSessions);
          
          // Restore current session ID
          if (savedCurrentSessionId && uniqueSessions.find((s: any) => s.id === savedCurrentSessionId)) {
            setCurrentSessionId(savedCurrentSessionId);
            logger.debug('恢復當前會話', { sessionId: savedCurrentSessionId });
          } else if (uniqueSessions.length > 0) {
            // If no valid current session, choose the latest one
            const latestSession = uniqueSessions[0];
            setCurrentSessionId(latestSession.id);
            localStorage.setItem('currentSessionId', latestSession.id);
            logger.debug('設置最新會話為當前會話', { sessionId: latestSession.id });
          }
        } else {
          logger.warn('保存的資料中沒有有效會話');
          setSessions([]);
          setCurrentSessionId(null);
          localStorage.removeItem('currentSessionId');
        }
      } else {
        logger.info('沒有找到保存的會話，從頭開始');
        setSessions([]);
        setCurrentSessionId(null);
        localStorage.removeItem('currentSessionId');
      }
      
      setIsInitialized(true);
    } catch (error) {
      logger.error('載入聊天紀錄失敗', error);
      
      // Clear corrupted data but keep backup
      try {
        const corruptedData = localStorage.getItem('chatSessions');
        if (corruptedData) {
          localStorage.setItem('chatSessions_backup', corruptedData);
          logger.info('已備份損壞的資料到 chatSessions_backup');
        }
        localStorage.removeItem('chatSessions');
        localStorage.removeItem('currentSessionId');
      } catch (clearError) {
        logger.error('清除損壞資料失敗', clearError);
      }
      
      setSessions([]);
      setCurrentSessionId(null);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  // 載入聊天紀錄 - 只在首次掛載時執行
  useEffect(() => {
    if (!isInitialized) {
      console.log('Initializing useChatHistory hook...');
      loadSessions();
      setIsInitialized(true);
    }
  }, [isInitialized, loadSessions]);

  // 監聽頁面可見性變化，當頁面重新可見時重新載入會話
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, reloading sessions...');
        loadSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadSessions, isInitialized]);

  // 監聽 localStorage 變化（跨標籤頁同步）
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chatSessions' || e.key === 'currentSessionId') {
        console.log('localStorage changed, reloading sessions...');
        loadSessions();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadSessions, isInitialized]);

  // 監聽頁面卸載，確保數據被保存
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      console.log('Page unloading, ensuring data is saved...');
      // 確保當前狀態被保存到 localStorage
      if (sessions.length > 0) {
        try {
          localStorage.setItem('chatSessions', JSON.stringify(sessions));
          if (currentSessionId) {
            localStorage.setItem('currentSessionId', currentSessionId);
          }
        } catch (error) {
          console.error('Failed to save data before unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessions, currentSessionId]);

  const saveSessions = useCallback((newSessions: ChatSession[]) => {
    try {
      // 深度清理數據，確保移除任何可能的循環引用和不需要的屬性
      const cleanSessions: ChatSession[] = newSessions.map(session => {
        // 確保 session 是純對象
        const cleanSession: ChatSession = {
          id: String(session.id || ''),
          name: String(session.name || ''),
          messages: Array.isArray(session.messages) ? session.messages.map(msg => {
            // 確保 message 是純對象，只保留需要的屬性
            const cleanMessage: Message = {
              id: String(msg.id || ''),
              role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'user',
              content: String(msg.content || ''),
              timestamp: String(msg.timestamp || new Date().toISOString()),
              ...(msg.model && { model: String(msg.model) })
            };
            return cleanMessage;
          }).filter(msg => msg.id && msg.role && msg.content) : [],
          createdAt: String(session.createdAt || new Date().toISOString()),
          lastModified: String(session.lastModified || new Date().toISOString())
        };
        return cleanSession;
      }).filter(session => session.id && session.name);
      
      // 去除重複的 session ID，保留最新的
      const uniqueSessions = cleanSessions.reduce((acc: ChatSession[], session: ChatSession) => {
        const existingIndex = acc.findIndex(s => s.id === session.id);
        if (existingIndex >= 0) {
          // 如果已存在，比較時間戳，保留較新的
          const existing = acc[existingIndex];
          const sessionTime = new Date(session.lastModified || session.createdAt || 0).getTime();
          const existingTime = new Date(existing.lastModified || existing.createdAt || 0).getTime();
          if (sessionTime > existingTime) {
            acc[existingIndex] = session;
          }
        } else {
          acc.push(session);
        }
        return acc;
      }, []);
      
      // 使用自定義序列化來防止循環引用
      const jsonString = JSON.stringify(uniqueSessions, (key, value) => {
        // 跳過可能導致循環引用的屬性
        if (key === 'target' || key === 'currentTarget' || key === 'srcElement') {
          return undefined;
        }
        // 確保值是可序列化的
        if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') {
          return undefined;
        }
        return value;
      });
      
      // 先保存到臨時鍵，驗證成功後再替換主鍵
      localStorage.setItem('chatSessions_temp', jsonString);
      
      // 驗證保存的數據是否可以正確解析
      const testParsed = JSON.parse(localStorage.getItem('chatSessions_temp') || '[]');
      if (Array.isArray(testParsed)) {
        // 驗證成功，替換主鍵
        localStorage.setItem('chatSessions', jsonString);
        localStorage.removeItem('chatSessions_temp');
        
        // 立即更新狀態
        setSessions(cleanSessions);
        
        console.log('Sessions saved successfully:', {
          count: cleanSessions.length,
          totalMessages: cleanSessions.reduce((total, s) => total + s.messages.length, 0),
          currentSession: cleanSessions.find(s => s.id === currentSessionId)?.name || 'none',
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error('Saved data validation failed');
      }
    } catch (error) {
      console.error('儲存聊天紀錄失敗:', error);
      // 清理臨時數據
      try {
        localStorage.removeItem('chatSessions_temp');
      } catch (cleanError) {
        console.error('清除臨時資料失敗:', cleanError);
      }
      
      // 嘗試恢復到上一個穩定狀態
      try {
        const backupData = localStorage.getItem('chatSessions_backup');
        if (backupData) {
          console.log('Attempting to restore from backup...');
          const backupSessions = JSON.parse(backupData);
          if (Array.isArray(backupSessions) && backupSessions.length > 0) {
            setSessions(backupSessions);
            console.log('Restored from backup successfully');
            return;
          }
        }
      } catch (restoreError) {
        console.error('Failed to restore from backup:', restoreError);
      }
      
      // 如果所有恢復嘗試都失敗，保持當前狀態但不更新 localStorage
      console.error('All recovery attempts failed, maintaining current state');
    }
  }, [currentSessionId]);

  const createNewSession = useCallback((name?: string) => {
    const newSession: ChatSession = {
      id: uuidv4(),
      name: name || `對話 ${sessions.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    const updatedSessions = [newSession, ...sessions];
    saveSessions(updatedSessions);
    updateCurrentSessionId(newSession.id);
    return newSession.id;
  }, [sessions, updateCurrentSessionId, saveSessions]);

  const getCurrentSession = useCallback(() => {
    return sessions.find(session => session.id === currentSessionId);
  }, [sessions, currentSessionId]);

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    let targetSessionId = currentSessionId;
    
    // 如果沒有當前會話，創建一個新的
    if (!targetSessionId) {
      targetSessionId = createNewSession();
    }

    const newMessage: Message = {
      id: uuidv4(),
      role: message.role,
      content: message.content,
      timestamp: new Date().toISOString(),
      model: message.model
    };

    console.log('addMessage called:', {
      role: newMessage.role,
      contentLength: newMessage.content.length,
      targetSessionId,
      currentSessions: sessions.length
    });

    // 確保會話存在
    const targetSession = sessions.find(s => s.id === targetSessionId);
    if (!targetSession) {
      console.error('Target session not found, creating new session');
      targetSessionId = createNewSession();
    }

    // 立即更新狀態 - 使用函數式更新確保狀態同步
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(session => 
        session.id === targetSessionId 
          ? {
              ...session,
              messages: [...session.messages, newMessage],
              lastModified: new Date().toISOString()
            }
          : session
      );

      console.log('Sessions updated in memory:', {
        targetSessionId,
        messageCount: updatedSessions.find(s => s.id === targetSessionId)?.messages.length,
        totalSessions: updatedSessions.length
      });

      // 異步保存到 localStorage，但不依賴它來更新狀態
      setTimeout(() => {
        try {
          const cleanSessions = updatedSessions.map((session) => {
            const cleanSession = {
              id: String(session.id || ''),
              name: String(session.name || ''),
              messages: Array.isArray(session.messages) ? session.messages.map((msg) => {
                const cleanMessage = {
                  id: String(msg.id || ''),
                  role: msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
                  content: String(msg.content || ''),
                  timestamp: String(msg.timestamp || new Date().toISOString()),
                  ...(msg.model && { model: String(msg.model) })
                };
                return cleanMessage;
              }).filter((msg) => msg.id && msg.role && msg.content) : [],
              createdAt: String(session.createdAt || new Date().toISOString()),
              lastModified: String(session.lastModified || new Date().toISOString())
            };
            return cleanSession;
          }).filter((session) => session.id && session.name);

          const jsonString = JSON.stringify(cleanSessions, (key, value) => {
            if (key === 'target' || key === 'currentTarget' || key === 'srcElement') {
              return undefined;
            }
            if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'undefined') {
              return undefined;
            }
            return value;
          });
          
          localStorage.setItem('chatSessions', jsonString);
          console.log('Sessions saved to localStorage asynchronously');
        } catch (error) {
          console.error('Failed to save sessions to localStorage:', error);
        }
      }, 0);

      return updatedSessions;
    });
    
    return newMessage;
  }, [currentSessionId, sessions, createNewSession]);

  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? {
            ...session,
            messages: session.messages.map(msg => 
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
            lastModified: new Date().toISOString()
          }
        : session
    );

    saveSessions(updatedSessions);
  }, [sessions, currentSessionId, saveSessions]);

  const deleteSession = useCallback((sessionId: string) => {
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    saveSessions(updatedSessions);
    
    if (currentSessionId === sessionId) {
      updateCurrentSessionId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
    }
  }, [sessions, currentSessionId, updateCurrentSessionId, saveSessions]);

  const renameSession = useCallback((sessionId: string, newName: string) => {
    const updatedSessions = sessions.map(session => 
      session.id === sessionId 
        ? { ...session, name: newName, lastModified: new Date().toISOString() }
        : session
    );
    saveSessions(updatedSessions);
  }, [sessions, saveSessions]);

  const clearCurrentSession = useCallback(() => {
    if (!currentSessionId) return;
    
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages: [], lastModified: new Date().toISOString() }
        : session
    );
    saveSessions(updatedSessions);
  }, [currentSessionId, sessions, saveSessions]);

  const exportSessions = () => {
    // 為每個 session 加工，確保包含完整信息
    const exportedSessions = sessions.map(session => ({
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      lastModified: session.lastModified,
      messageCount: session.messages.length,
      messages: session.messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        model: message.model || 'unknown',
        formattedTime: new Date(message.timestamp).toLocaleString('zh-TW')
      })),
      summary: {
        userMessages: session.messages.filter(m => m.role === 'user').length,
        assistantMessages: session.messages.filter(m => m.role === 'assistant').length,
        totalCharacters: session.messages.reduce((sum, m) => sum + m.content.length, 0)
      }
    }));

    return {
      sessions: exportedSessions,
      exportDate: new Date().toISOString(),
      exportDateFormatted: new Date().toLocaleString('zh-TW'),
      version: '1.1',
      totalSessions: exportedSessions.length,
      totalMessages: exportedSessions.reduce((sum, s) => sum + s.messageCount, 0),
      metadata: {
        exportedBy: 'AI聊天助手',
        exportFormat: 'JSON',
        includesUserMessages: true,
        includesAssistantMessages: true
      }
    };
  };

  const importSessions = useCallback((importedSessions: any) => {
    try {
      // 首先檢查是否為陣列
      if (!Array.isArray(importedSessions)) {
        // 如果不是陣列，檢查是否有 sessions 屬性
        if (importedSessions && Array.isArray(importedSessions.sessions)) {
          importedSessions = importedSessions.sessions;
        } else {
          throw new Error('匯入的資料格式不正確：必須是陣列或包含 sessions 陣列的物件');
        }
      }

      // 驗證匯入的資料格式
      const validSessions: ChatSession[] = importedSessions.filter((session: any) => 
        session && 
        typeof session === 'object' &&
        session.id && 
        session.name && 
        Array.isArray(session.messages)
      );
      
      if (validSessions.length === 0) {
        throw new Error('匯入的資料格式不正確：沒有找到有效的對話會話');
      }

      // 清理和標準化資料
      const cleanedSessions: ChatSession[] = validSessions.map(session => ({
        id: session.id,
        name: session.name,
        messages: session.messages.map((msg: any) => ({
          id: msg.id || Date.now().toString(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          model: msg.model
        })).filter((msg: any) => msg.role && msg.content),
        createdAt: session.createdAt || new Date().toISOString(),
        lastModified: session.lastModified || new Date().toISOString()
      }));

      // 合併現有會話和匯入的會話，而不是替換
      const mergedSessions = [...cleanedSessions, ...sessions];
      
      // 去除重複的 session ID，保留最新的
      const uniqueMergedSessions = mergedSessions.reduce((acc: ChatSession[], session: ChatSession) => {
        const existingIndex = acc.findIndex(s => s.id === session.id);
        if (existingIndex >= 0) {
          // 如果已存在，比較時間戳，保留較新的
          const existing = acc[existingIndex];
          const sessionTime = new Date(session.lastModified || session.createdAt || 0).getTime();
          const existingTime = new Date(existing.lastModified || existing.createdAt || 0).getTime();
          if (sessionTime > existingTime) {
            acc[existingIndex] = session;
          }
        } else {
          acc.push(session);
        }
        return acc;
      }, []);
      
      saveSessions(uniqueMergedSessions);
      if (cleanedSessions.length > 0) {
        updateCurrentSessionId(cleanedSessions[0].id);
      }
      
      return cleanedSessions.length;
    } catch (error) {
      console.error('匯入聊天紀錄失敗:', error);
      throw error;
    }
  }, [sessions, saveSessions, updateCurrentSessionId]);

  return {
    sessions,
    currentSessionId,
    isLoading,
    setCurrentSessionId: updateCurrentSessionId,
    createNewSession,
    getCurrentSession,
    addMessage,
    updateMessage,
    deleteSession,
    renameSession,
    clearCurrentSession,
    exportSessions,
    importSessions
  };
}