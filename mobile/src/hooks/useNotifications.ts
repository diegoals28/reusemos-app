// ============================================
// REUSA - Notifications Hook
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';
import { useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt: Date;
  readAt?: Date;
}

interface UseNotificationsReturn {
  isConnected: boolean;
  unreadCount: number;
  notifications: Notification[];
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const queryClient = useQueryClient();
  const { isConnected, on, off, emit } = useSocket({ namespace: 'notifications' });
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!isConnected) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);

      // Invalidate relevant queries based on notification type
      switch (notification.type) {
        case 'message':
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          break;
        case 'purchase':
        case 'offer':
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          break;
        case 'review':
          queryClient.invalidateQueries({ queryKey: ['reviews'] });
          break;
        case 'favorite':
          queryClient.invalidateQueries({ queryKey: ['products', 'my'] });
          break;
      }
    };

    const handleUnreadCount = (data: { count: number }) => {
      setUnreadCount(data.count);
    };

    on('notification:new', handleNewNotification);
    on('notifications:unread_count', handleUnreadCount);

    return () => {
      off('notification:new', handleNewNotification);
      off('notifications:unread_count', handleUnreadCount);
    };
  }, [isConnected, on, off, queryClient]);

  const markAsRead = useCallback(
    (notificationId: string) => {
      emit('notification:read', { notificationId });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [emit]
  );

  const markAllAsRead = useCallback(() => {
    emit('notifications:read_all', {});
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date() }))
    );
    setUnreadCount(0);
  }, [emit]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    isConnected,
    unreadCount,
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
