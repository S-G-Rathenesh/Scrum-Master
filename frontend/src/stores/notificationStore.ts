import { create } from 'zustand';
import { notificationService, type NotificationItem } from '../services/notifications';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  fetchNotifications: (projectId: string) => Promise<void>;
  fetchUnreadCount: (projectId: string) => Promise<void>;
  markAsRead: (projectId: string, notificationId: string) => Promise<void>;
  markAllAsRead: (projectId: string) => Promise<void>;
  deleteNotification: (projectId: string, notificationId: string) => Promise<void>;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async (projectId: string) => {
    if (!projectId) return;
    set({ isLoading: true, error: null, notifications: [], unreadCount: 0 }); // Clear stale data
    try {
      const data = await notificationService.getNotifications(projectId);
      const unreadCount = data.filter(n => !n.isRead).length;
      set({ notifications: data, unreadCount, isLoading: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Failed to fetch notifications',
        isLoading: false
      });
    }
  },

  fetchUnreadCount: async (projectId: string) => {
    if (!projectId) return;
    try {
      const unreadCount = await notificationService.getUnreadCount(projectId);
      set({ unreadCount });
    } catch (err) {
      // Ignore background errors
    }
  },

  markAsRead: async (projectId: string, notificationId: string) => {
    try {
      await notificationService.markAsRead(projectId, notificationId);
      set((state) => {
        const updated = state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        const unreadCount = updated.filter((n) => !n.isRead).length;
        return { notifications: updated, unreadCount };
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async (projectId: string) => {
    try {
      await notificationService.markAllAsRead(projectId);
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  deleteNotification: async (projectId: string, notificationId: string) => {
    try {
      await notificationService.deleteNotification(projectId, notificationId);
      set((state) => {
        const updated = state.notifications.filter((n) => n.id !== notificationId);
        const unreadCount = updated.filter((n) => !n.isRead).length;
        return { notifications: updated, unreadCount };
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0, error: null });
  }
}));
