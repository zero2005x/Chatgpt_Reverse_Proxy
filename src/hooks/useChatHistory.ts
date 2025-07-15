import { useState, useEffect, useCallback } from 'react';
import { Message, ChatSession } from '@/types/message';
import { v4 as uuidv4 } from 'uuid';

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = useCallback(() => {
    try {
      const savedSessions = localStorage.getItem('chatSessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        
        // 如果有 session 但沒有當前 session，選擇最新的一個
        // 使用函數式更新來避免依賴當前的 currentSessionId
        setCurrentSessionId(current => {
          if (parsed.length > 0 && !current) {
            return parsed[0].id;
          }
          return current;
        });
      }
    } catch (error) {
      console.error('載入聊天紀錄失敗:', error);
    }
  }, []); // 移除 currentSessionId 依賴

  // 載入聊天紀錄
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const saveSessions = (newSessions: ChatSession[]) => {
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
      
      // 使用自定義序列化來防止循環引用
      const jsonString = JSON.stringify(cleanSessions, (key, value) => {
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
      
      localStorage.setItem('chatSessions', jsonString);
      setSessions(cleanSessions);
    } catch (error) {
      console.error('儲存聊天紀錄失敗:', error);
      // 嘗試清除損壞的資料
      try {
        localStorage.removeItem('chatSessions');
        setSessions([]);
      } catch (clearError) {
        console.error('清除損壞資料失敗:', clearError);
      }
    }
  };

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
    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, [sessions]);

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

    const updatedSessions = sessions.map(session => 
      session.id === targetSessionId 
        ? {
            ...session,
            messages: [...session.messages, newMessage],
            lastModified: new Date().toISOString()
          }
        : session
    );

    saveSessions(updatedSessions);
    return newMessage;
  }, [currentSessionId, sessions, createNewSession]);

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
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
  };

  const deleteSession = useCallback((sessionId: string) => {
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    saveSessions(updatedSessions);
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
    }
  }, [sessions, currentSessionId]);

  const renameSession = useCallback((sessionId: string, newName: string) => {
    const updatedSessions = sessions.map(session => 
      session.id === sessionId 
        ? { ...session, name: newName, lastModified: new Date().toISOString() }
        : session
    );
    saveSessions(updatedSessions);
  }, [sessions]);

  const clearCurrentSession = () => {
    if (!currentSessionId) return;
    
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, messages: [], lastModified: new Date().toISOString() }
        : session
    );
    saveSessions(updatedSessions);
  };

  const exportSessions = () => {
    return {
      sessions: sessions,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  };

  const importSessions = (importedSessions: any) => {
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
      saveSessions(mergedSessions);
      if (cleanedSessions.length > 0) {
        setCurrentSessionId(cleanedSessions[0].id);
      }
      
      return cleanedSessions.length;
    } catch (error) {
      console.error('匯入聊天紀錄失敗:', error);
      throw error;
    }
  };

  return {
    sessions,
    currentSessionId,
    isLoading,
    setCurrentSessionId,
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