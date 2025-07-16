import { useState, useEffect, useCallback, useRef } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export default function Notification({
  type,
  title,
  message,
  duration = 5000,
  onClose,
  className = ''
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const onCloseRef = useRef(onClose);

  // Keep the ref updated with the latest onClose function
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Memoize the close handler to prevent unnecessary re-renders
  const handleAutoClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onCloseRef.current?.(), 300);
  }, []); // No dependencies needed since we use ref

  // Setup auto-close timer
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onCloseRef.current?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => onCloseRef.current?.(), 300);
  }, []); // No dependencies needed since we use ref

  const typeConfig = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      icon: '✅'
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
      icon: '❌'
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
      icon: '⚠️'
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
      icon: 'ℹ️'
    }
  };

  const config = typeConfig[type];

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      } ${className}`}
    >
      <div className={`max-w-md w-full ${config.bgColor} border ${config.borderColor} rounded-lg shadow-lg`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${config.iconColor} text-lg mr-3`}>
              {config.icon}
            </div>
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${config.textColor}`}>
                {title}
              </h3>
              <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>
                {message}
              </p>
            </div>
            <button
              onClick={handleClose}
              className={`ml-3 inline-flex ${config.textColor} hover:opacity-75 transition-opacity`}
            >
              <span className="sr-only">關閉</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 通知管理 Hook
export function useNotification() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
  }>>([]);

  // 使用計數器確保 ID 唯一性
  const idCounterRef = useRef(0);
  // 記錄最近的通知，避免重複
  const recentNotificationsRef = useRef<Map<string, number>>(new Map());

  const addNotification = useCallback((notification: Omit<typeof notifications[0], 'id'>) => {
    const notificationKey = `${notification.type}-${notification.title}-${notification.message}`;
    const now = Date.now();
    
    // 檢查是否在 1 秒內有相同的通知
    const lastTime = recentNotificationsRef.current.get(notificationKey);
    if (lastTime && now - lastTime < 1000) {
      console.log('Duplicate notification prevented:', notificationKey);
      return; // 防止重複通知
    }
    
    // 記錄這次通知的時間
    recentNotificationsRef.current.set(notificationKey, now);
    
    // 清理超過 5 秒的記錄
    for (const [key, time] of recentNotificationsRef.current.entries()) {
      if (now - time > 5000) {
        recentNotificationsRef.current.delete(key);
      }
    }
    
    // 組合時間戳和計數器，確保唯一性
    const id = `${now}-${++idCounterRef.current}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const showError = useCallback((title: string, message: string) => {
    addNotification({ type: 'error', title, message });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string) => {
    addNotification({ type: 'warning', title, message });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string) => {
    addNotification({ type: 'info', title, message });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}