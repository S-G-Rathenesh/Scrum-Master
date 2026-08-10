import { api } from './api';

export interface NotificationItem {
  id: string;
  ownerId: string;
  projectId: string;
  type: 'NEW_FEEDBACK' | 'CRITICAL_ERROR' | 'INCIDENT' | 'SYSTEM';
  title: string;
  message: string;
  relatedEntity?: 'feedback' | 'error' | 'incident';
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  getNotifications: async (projectId: string, unreadOnly = false): Promise<NotificationItem[]> => {
    const response = await api.get(`/projects/${projectId}/notifications`, {
      params: { unreadOnly }
    });
    return response.data;
  },

  getUnreadCount: async (projectId: string): Promise<number> => {
    const response = await api.get(`/projects/${projectId}/notifications/unread-count`);
    return response.data.unreadCount;
  },

  markAsRead: async (projectId: string, notificationId: string): Promise<void> => {
    await api.patch(`/projects/${projectId}/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (projectId: string): Promise<void> => {
    await api.patch(`/projects/${projectId}/notifications/read-all`);
  },

  deleteNotification: async (projectId: string, notificationId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/notifications/${notificationId}`);
  }
};
