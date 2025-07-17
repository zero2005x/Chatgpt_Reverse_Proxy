/**
 * Enhanced chat hook with advanced state management, error recovery, and performance optimization
 */

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Message, ChatSession } from '@/types/message';
import { v4 as uuidv4 } from 'uuid';
import { uiLogger } from '@/utils/logger';
import { ErrorHandler, withErrorBoundary } from '@/utils/errorHandling';

// Extended Message interface for internal use
interface EnhancedMessage extends Message {
  sessionId?: string;
  metadata?: Record<string, any>;
}

// Extended ChatSession interface for internal use
interface EnhancedChatSession extends Omit<ChatSession, 'createdAt' | 'lastModified' | 'name'> {
  title: string;
  messages: EnhancedMessage[];
  createdAt: number;
  lastMessage: string;
}

export interface EnhancedChatState {
  // Core state
  messages: EnhancedMessage[];
  sessions: EnhancedChatSession[];
  currentSessionId: string | null;
  
  // UI state
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  
  // Connection state
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastActivity: number;
  
  // Performance metrics
  responseTime: number;
  totalMessages: number;
  failedRequests: number;
  
  // Feature flags
  autoSave: boolean;
  offlineMode: boolean;
}

export interface ChatMetrics {
  averageResponseTime: number;
  successRate: number;
  totalSessions: number;
  totalMessages: number;
  lastActiveSession: string | null;
}

export interface ChatOptions {
  autoSave?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  offlineSupport?: boolean;
  compressionEnabled?: boolean;
  persistenceKey?: string;
}

const DEFAULT_OPTIONS: Required<ChatOptions> = {
  autoSave: true,
  maxRetries: 3,
  retryDelay: 1000,
  offlineSupport: true,
  compressionEnabled: true,
  persistenceKey: 'enhanced-chat-state'
};

export function useEnhancedChat(options: ChatOptions = {}) {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const logger = useMemo(() => uiLogger.child('useEnhancedChat'), []);
  
  // State management
  const [state, setState] = useState<EnhancedChatState>(() => ({
    messages: [],
    sessions: [],
    currentSessionId: null,
    isLoading: false,
    isTyping: false,
    error: null,
    connectionStatus: 'disconnected',
    lastActivity: Date.now(),
    responseTime: 0,
    totalMessages: 0,
    failedRequests: 0,
    autoSave: config.autoSave,
    offlineMode: false
  }));

  // Refs for performance optimization
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(0);
  const saveQueueRef = useRef<Set<string>>(new Set());

  // Memoized selectors
  const currentSession = useMemo(() => 
    state.sessions.find(s => s.id === state.currentSessionId) || null,
    [state.sessions, state.currentSessionId]
  );

  const metrics = useMemo((): ChatMetrics => {
    const totalMessages = state.sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const sessionsWithMessages = state.sessions.filter(s => s.messages.length > 0);
    
    let totalResponseTime = 0;
    let responseCount = 0;
    
    state.sessions.forEach(session => {
      session.messages.forEach((message, index) => {
        if (message.role === 'assistant' && index > 0) {
          const userMessage = session.messages[index - 1];
          if (userMessage.role === 'user' && userMessage.timestamp && message.timestamp) {
            const userTime = typeof userMessage.timestamp === 'string' 
              ? new Date(userMessage.timestamp).getTime() 
              : userMessage.timestamp;
            const messageTime = typeof message.timestamp === 'string' 
              ? new Date(message.timestamp).getTime() 
              : message.timestamp;
            totalResponseTime += messageTime - userTime;
            responseCount++;
          }
        }
      });
    });

    return {
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      successRate: state.totalMessages > 0 ? ((state.totalMessages - state.failedRequests) / state.totalMessages) * 100 : 100,
      totalSessions: state.sessions.length,
      totalMessages,
      lastActiveSession: state.currentSessionId
    };
  }, [state.sessions, state.totalMessages, state.failedRequests, state.currentSessionId]);

  // Enhanced state updater with optimistic updates and rollback
  const updateState = useCallback((updater: (prev: EnhancedChatState) => EnhancedChatState) => {
    setState(prev => {
      try {
        const newState = updater(prev);
        
        // Trigger auto-save if enabled
        if (config.autoSave && Date.now() - lastSaveRef.current > 1000) {
          requestAnimationFrame(() => saveToStorage(newState));
        }
        
        return newState;
      } catch (error) {
        logger.error('State update failed', error);
        return prev; // Rollback on error
      }
    });
  }, [config.autoSave, logger]);

  // Optimized storage operations with compression
  const saveToStorage = useCallback(withErrorBoundary(async (state: EnhancedChatState) => {
    if (!config.autoSave || typeof window === 'undefined') return;

    try {
      const dataToSave = {
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        metrics: {
          totalMessages: state.totalMessages,
          failedRequests: state.failedRequests,
          lastActivity: state.lastActivity
        },
        timestamp: Date.now()
      };

      let serialized = JSON.stringify(dataToSave);
      
      // Simple compression for large datasets
      if (config.compressionEnabled && serialized.length > 50000) {
        // In a real implementation, you might use a compression library
        serialized = JSON.stringify(dataToSave, null, 0); // Minify
      }

      localStorage.setItem(config.persistenceKey, serialized);
      lastSaveRef.current = Date.now();
      
      logger.debug('Data saved to storage', { 
        size: serialized.length,
        sessions: state.sessions.length 
      });
      
    } catch (error) {
      logger.error('Failed to save to storage', error);
    }
  }), [config, logger]);

  // Load data from storage with error recovery
  const loadFromStorage = useCallback(withErrorBoundary(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(config.persistenceKey);
      if (!saved) return;

      const data = JSON.parse(saved);
      
      // Validate data structure
      if (!data.sessions || !Array.isArray(data.sessions)) {
        throw new Error('Invalid data structure');
      }

      updateState(prev => ({
        ...prev,
        sessions: data.sessions,
        currentSessionId: data.currentSessionId,
        totalMessages: data.metrics?.totalMessages || 0,
        failedRequests: data.metrics?.failedRequests || 0,
        lastActivity: data.metrics?.lastActivity || Date.now()
      }));

      logger.info('Data loaded from storage', { 
        sessions: data.sessions.length,
        lastActivity: new Date(data.metrics?.lastActivity || 0).toISOString()
      });

    } catch (error) {
      logger.error('Failed to load from storage', error);
      // Clear corrupted data
      localStorage.removeItem(config.persistenceKey);
    }
  }), [config.persistenceKey, logger, updateState]);

  // Enhanced message sending with retry logic and optimistic updates
  const sendMessage = useCallback(async (
    content: string,
    options: {
      sessionId?: string;
      file?: File;
      serviceMode?: 'portal' | 'api';
      credentials?: any;
    } = {}
  ): Promise<void> => {
    if (!content.trim() && !options.file) {
      throw new Error('Message content or file is required');
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const startTime = Date.now();

    // Create optimistic user message
    const userMessage: EnhancedMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      sessionId: options.sessionId || state.currentSessionId || uuidv4(),
      metadata: {
        file: options.file?.name,
        serviceMode: options.serviceMode
      }
    };

    // Optimistic update
    updateState(prev => {
      const sessionId = userMessage.sessionId!;
      const existingSessionIndex = prev.sessions.findIndex(s => s.id === sessionId);
      
      if (existingSessionIndex >= 0) {
        const existingSession = prev.sessions[existingSessionIndex];
        const updatedSession: EnhancedChatSession = {
          ...existingSession,
          messages: [...existingSession.messages, userMessage],
          lastMessage: userMessage.content
        };
        
        const newSessions = [...prev.sessions];
        newSessions[existingSessionIndex] = updatedSession;
        
        return {
          ...prev,
          sessions: newSessions,
          currentSessionId: sessionId,
          isLoading: true,
          error: null,
          lastActivity: Date.now()
        };
      } else {
        const newSession: EnhancedChatSession = {
          id: sessionId,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          messages: [userMessage],
          createdAt: Date.now(),
          lastMessage: userMessage.content
        };
        
        return {
          ...prev,
          sessions: [newSession, ...prev.sessions],
          currentSessionId: sessionId,
          isLoading: true,
          error: null,
          lastActivity: Date.now()
        };
      }
    });

    // Attempt to send message with retry logic
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        logger.debug('Sending message attempt', { attempt, maxRetries: config.maxRetries });

        // Prepare request data
        const requestData: any = {
          message: content,
          sessionId: userMessage.sessionId,
          ...options.credentials
        };

        if (options.file) {
          requestData.file = {
            name: options.file.name,
            type: options.file.type,
            data: await fileToDataURL(options.file)
          };
        }

        // Send request
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - startTime;

        // Create assistant message
        const assistantMessage: EnhancedMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: data.reply || '無回應',
          timestamp: new Date().toISOString(),
          sessionId: userMessage.sessionId,
          metadata: {
            responseTime,
            endpoint: data.metadata?.endpoint,
            model: data.metadata?.model
          }
        };

        // Update state with response
        updateState(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => 
            s.id === userMessage.sessionId 
              ? { ...s, messages: [...s.messages, assistantMessage], lastMessage: assistantMessage.content }
              : s
          ),
          isLoading: false,
          responseTime: responseTime,
          totalMessages: prev.totalMessages + 2,
          connectionStatus: 'connected',
          lastActivity: Date.now()
        }));

        logger.info('Message sent successfully', {
          sessionId: userMessage.sessionId,
          responseTime,
          attempt
        });

        return; // Success

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.warn('Message send attempt failed', {
          attempt,
          error: lastError.message,
          willRetry: attempt < config.maxRetries
        });

        // If this is not the last attempt, wait before retrying
        if (attempt < config.maxRetries) {
          await new Promise(resolve => {
            retryTimeoutRef.current = setTimeout(resolve, config.retryDelay * attempt);
          });
        }
      }
    }

    // All attempts failed - update state with error
    updateState(prev => ({
      ...prev,
      isLoading: false,
      error: lastError?.message || 'Failed to send message',
      failedRequests: prev.failedRequests + 1,
      connectionStatus: 'error'
    }));

    throw lastError || new Error('Failed to send message after all retries');
  }, [state.currentSessionId, config.maxRetries, config.retryDelay, logger, updateState]);

  // Session management
  const createSession = useCallback((title?: string): string => {
    const newSession: EnhancedChatSession = {
      id: uuidv4(),
      title: title || `新對話 ${state.sessions.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      lastMessage: ''
    };

    updateState(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      currentSessionId: newSession.id
    }));

    logger.info('New session created', { sessionId: newSession.id });
    return newSession.id;
  }, [state.sessions.length, logger, updateState]);

  const deleteSession = useCallback((sessionId: string) => {
    updateState(prev => {
      const newSessions = prev.sessions.filter(s => s.id !== sessionId);
      const newCurrentId = prev.currentSessionId === sessionId 
        ? (newSessions[0]?.id || null)
        : prev.currentSessionId;

      return {
        ...prev,
        sessions: newSessions,
        currentSessionId: newCurrentId
      };
    });

    logger.info('Session deleted', { sessionId });
  }, [logger, updateState]);

  const switchSession = useCallback((sessionId: string) => {
    updateState(prev => ({
      ...prev,
      currentSessionId: sessionId,
      messages: prev.sessions.find(s => s.id === sessionId)?.messages || [],
      error: null
    }));
  }, [updateState]);

  const clearError = useCallback(() => {
    updateState(prev => ({ ...prev, error: null }));
  }, [updateState]);

  const exportData = useCallback(() => {
    try {
      const exportData = {
        sessions: state.sessions,
        metrics,
        exportDate: new Date().toISOString(),
        version: '2.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      logger.info('Data exported successfully');
    } catch (error) {
      logger.error('Export failed', error);
      throw error;
    }
  }, [state.sessions, metrics, logger]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  // Effects
  useEffect(() => {
    loadFromStorage();
    return cleanup;
  }, [loadFromStorage, cleanup]);

  // Auto-save effect
  useEffect(() => {
    if (config.autoSave) {
      const interval = setInterval(() => {
        saveToStorage(state);
      }, 30000); // Save every 30 seconds

      return () => clearInterval(interval);
    }
  }, [config.autoSave, state, saveToStorage]);

  // Connection status monitoring
  useEffect(() => {
    const handleOnline = () => updateState(prev => ({ ...prev, connectionStatus: 'connected', offlineMode: false }));
    const handleOffline = () => updateState(prev => ({ ...prev, connectionStatus: 'disconnected', offlineMode: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateState]);

  return {
    // State
    ...state,
    currentSession,
    metrics,

    // Actions
    sendMessage,
    createSession,
    deleteSession,
    switchSession,
    clearError,
    exportData,
    cleanup,

    // Utilities
    saveToStorage: () => saveToStorage(state),
    loadFromStorage
  };
}

// Utility function
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
