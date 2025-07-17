/**
 * Enhanced notification system with better state management and error handling
 */

import { useState, useCallback, useRef } from 'react';
import { uiLogger } from '@/utils/logger';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  showSuccess: (title: string, message: string, options?: Partial<NotificationItem>) => string;
  showError: (title: string, message: string, options?: Partial<NotificationItem>) => string;
  showWarning: (title: string, message: string, options?: Partial<NotificationItem>) => string;
  showInfo: (title: string, message: string, options?: Partial<NotificationItem>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  updateNotification: (id: string, updates: Partial<NotificationItem>) => void;
}

export function useNotification(): NotificationContextType {
  const logger = uiLogger.child('useNotification');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const notificationIdCounter = useRef(0);

  const generateId = useCallback(() => {
    return `notification-${Date.now()}-${++notificationIdCounter.current}`;
  }, []);

  const addNotification = useCallback((
    type: NotificationItem['type'],
    title: string,
    message: string,
    options: Partial<NotificationItem> = {}
  ): string => {
    try {
      const id = generateId();
      const notification: NotificationItem = {
        id,
        type,
        title,
        message,
        duration: options.duration ?? (type === 'error' ? 8000 : 5000),
        persistent: options.persistent ?? false,
        timestamp: Date.now(),
        metadata: options.metadata,
        ...options,
      };

      logger.debug('添加通知', { 
        id, 
        type, 
        title: title.substring(0, 50),
        hasMetadata: !!options.metadata 
      });

      setNotifications(prev => {
        // Limit to maximum 10 notifications to prevent memory issues
        const updated = [notification, ...prev].slice(0, 10);
        return updated;
      });

      // Auto-remove non-persistent notifications
      if (!notification.persistent && notification.duration && notification.duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, notification.duration);
      }

      return id;
    } catch (error) {
      logger.error('添加通知失敗', error, { type, title, message });
      return '';
    }
  }, [generateId, logger]);

  const removeNotification = useCallback((id: string) => {
    try {
      logger.debug('移除通知', { id });
      
      setNotifications(prev => {
        const filtered = prev.filter(notification => notification.id !== id);
        return filtered;
      });
    } catch (error) {
      logger.error('移除通知失敗', error, { id });
    }
  }, [logger]);

  const updateNotification = useCallback((id: string, updates: Partial<NotificationItem>) => {
    try {
      logger.debug('更新通知', { id, updates: Object.keys(updates) });
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, ...updates }
            : notification
        )
      );
    } catch (error) {
      logger.error('更新通知失敗', error, { id, updates });
    }
  }, [logger]);

  const clearAllNotifications = useCallback(() => {
    try {
      logger.info('清除所有通知', { count: notifications.length });
      setNotifications([]);
    } catch (error) {
      logger.error('清除所有通知失敗', error);
    }
  }, [logger, notifications.length]);

  const showSuccess = useCallback((title: string, message: string, options?: Partial<NotificationItem>) => {
    return addNotification('success', title, message, options);
  }, [addNotification]);

  const showError = useCallback((title: string, message: string, options?: Partial<NotificationItem>) => {
    return addNotification('error', title, message, { persistent: false, ...options });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string, options?: Partial<NotificationItem>) => {
    return addNotification('warning', title, message, options);
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string, options?: Partial<NotificationItem>) => {
    return addNotification('info', title, message, options);
  }, [addNotification]);

  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification,
    clearAllNotifications,
    updateNotification,
  };
}
