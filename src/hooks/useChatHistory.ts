import { useState, useEffect } from 'react';
import { Message, ChatSession } from '@/types/message';
import { v4 as uuidv4 } from 'uuid';

export function useChatHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 載入聊天紀錄
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = () => {
    try {
      const savedSessions = localStorage.getItem('chatSessions');
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        
        // 如果有 session 但沒有當前 session，選擇最新的一個
        if (parsed.length > 0 && !currentSessionId) {
          setCurrentSessionId(parsed[0].id);
        }
      }
    } catch (error) {
      console.error('載入聊天紀錄失敗:', error);
    }
  };

  const saveSessions = (newSessions: ChatSession[]) => {
    try {
      // 清理數據，移除任何可能的循環引用
      const cleanSessions = newSessions.map(session => ({
        id: session.id,
        name: session.name,
        messages: session.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          model: msg.model
        })),
        createdAt: session.createdAt,
        lastModified: session.lastModified
      }));
      
      localStorage.setItem('chatSessions', JSON.stringify(cleanSessions));
      setSessions(cleanSessions);
    } catch (error) {
      console.error('儲存聊天紀錄失敗:', error);
    }
  };

  const createNewSession = (name?: string) => {
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
  };

  const getCurrentSession = () => {
    return sessions.find(session => session.id === currentSessionId);
  };

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
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
  };

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

  const deleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    saveSessions(updatedSessions);
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(updatedSessions.length > 0 ? updatedSessions[0].id : null);
    }
  };

  const renameSession = (sessionId: string, newName: string) => {
    const updatedSessions = sessions.map(session => 
      session.id === sessionId 
        ? { ...session, name: newName, lastModified: new Date().toISOString() }
        : session
    );
    saveSessions(updatedSessions);
  };

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

      saveSessions(cleanedSessions);
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