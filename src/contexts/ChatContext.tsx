'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useChatHistory } from '@/hooks/useChatHistory';
import { Message, ChatSession } from '@/types/message';

interface ChatContextType {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  setCurrentSessionId: (sessionId: string | null) => void;
  createNewSession: (name?: string) => string;
  getCurrentSession: () => ChatSession | undefined;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Message;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, newName: string) => void;
  clearCurrentSession: () => void;
  exportSessions: () => any;
  importSessions: (importedSessions: any) => number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatHistory = useChatHistory();

  return (
    <ChatContext.Provider value={chatHistory}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

// 為了向後兼容，也導出 useChatHistory
export { useChatHistory };
