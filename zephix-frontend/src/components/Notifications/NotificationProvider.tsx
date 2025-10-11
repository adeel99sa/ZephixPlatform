import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Undo2 } from 'lucide-react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  undoAction?: () => void;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-hide after duration (default 5 seconds for success, 7 seconds for others)
    const duration = notification.duration || (notification.type === 'success' ? 5000 : 7000);
    setTimeout(() => {
      hideNotification(id);
    }, duration);
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification }}>
      {children}
      
      {/* Notification Container - Fixed at bottom center, 1 inch above bottom */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2" style={{ bottom: '16px' }}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => hideNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

function NotificationItem({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const getNotificationStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-600 text-white border-green-700';
      case 'error':
        return 'bg-red-600 text-white border-red-700';
      case 'warning':
        return 'bg-yellow-600 text-white border-yellow-700';
      case 'info':
        return 'bg-blue-600 text-white border-blue-700';
      default:
        return 'bg-gray-600 text-white border-gray-700';
    }
  };

  return (
    <div className={`${getNotificationStyles()} rounded-lg shadow-lg border px-4 py-3 min-w-80 max-w-md flex items-center gap-3 animate-slide-in-from-bottom`}>
      <div className="flex-1">
        <div className="font-medium text-sm">{notification.title}</div>
        <div className="text-xs opacity-90">{notification.message}</div>
      </div>
      
      <div className="flex items-center gap-2">
        {notification.undoAction && (
          <button
            onClick={() => {
              notification.undoAction?.();
              onClose();
            }}
            className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-medium transition-colors flex items-center gap-1"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        )}
        
        <button
          onClick={onClose}
          className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
