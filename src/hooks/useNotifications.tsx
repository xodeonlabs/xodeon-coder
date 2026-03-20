import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
  duration?: number; // milliseconds, null = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const add = (notification: Omit<Notification, 'id'>) => {
    const id = crypto.randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000, // Default 5 seconds
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration if specified
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        remove(id);
      }, newNotification.duration);
    }

    return id;
  };

  const remove = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const success = (message: string, options?: Partial<Notification>) => {
    return add({ type: 'success', message, ...options });
  };

  const error = (message: string, options?: Partial<Notification>) => {
    return add({ type: 'error', message, duration: 7000, ...options });
  };

  const info = (message: string, options?: Partial<Notification>) => {
    return add({ type: 'info', message, ...options });
  };

  const warning = (message: string, options?: Partial<Notification>) => {
    return add({ type: 'warning', message, ...options });
  };

  return {
    notifications,
    add,
    remove,
    success,
    error,
    info,
    warning,
  };
}

interface NotificationDisplayProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationDisplay({ notification, onClose }: NotificationDisplayProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  };

  const backgrounds = {
    success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  };

  return (
    <div
      className={`rounded-lg border p-4 ${backgrounds[notification.type]} animate-in fade-in slide-in-from-top-4 duration-300`}
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0">{icons[notification.type]}</div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{notification.message}</p>
          {notification.description && (
            <p className="text-sm text-muted-foreground mt-1">{notification.description}</p>
          )}

          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="text-sm font-semibold text-primary hover:underline mt-2"
            >
              {notification.action.label}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface NotificationsContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export function NotificationsContainer({ notifications, onClose }: NotificationsContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[1000] space-y-3 w-full max-w-sm pointer-events-none">
      {notifications.map(notification => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationDisplay
            notification={notification}
            onClose={() => onClose(notification.id)}
          />
        </div>
      ))}
    </div>
  );
}
