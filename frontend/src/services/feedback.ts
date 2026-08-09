import { api } from './api';

export type FeedbackCategory = 'GENERAL' | 'BUG' | 'FEATURE_REQUEST' | 'COMPLAINT' | 'QUESTION' | 'OTHER';
export type FeedbackSource = 'CONTACT_FORM' | 'FEEDBACK_FORM' | 'IN_APP';
export type FeedbackStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
export type FeedbackPriority = 'LOW' | 'NORMAL' | 'HIGH';

export interface FeedbackResponse {
  id: string;
  projectId: string;
  integrationId?: string;
  name?: string;
  email?: string;
  subject?: string;
  message: string;
  category: FeedbackCategory;
  source: FeedbackSource;
  pageUrl?: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  items: FeedbackResponse[];
  total: number;
  page: number;
  pages: number;
}

export const feedbackService = {
  getFeedback: async (
    projectId: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      priority?: string;
      category?: string;
      is_read?: boolean;
    } = {}
  ): Promise<FeedbackListResponse> => {
    const response = await api.get(`/projects/${projectId}/feedback`, { params });
    return response.data;
  },

  getFeedbackDetail: async (projectId: string, feedbackId: string): Promise<FeedbackResponse> => {
    const response = await api.get(`/projects/${projectId}/feedback/${feedbackId}`);
    return response.data;
  },

  updateFeedback: async (
    projectId: string,
    feedbackId: string,
    data: {
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      isRead?: boolean;
    }
  ): Promise<void> => {
    await api.patch(`/projects/${projectId}/feedback/${feedbackId}`, data);
  }
};
