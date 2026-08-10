import { create } from 'zustand';
import { feedbackService, type FeedbackResponse, type FeedbackStatus, type FeedbackPriority } from '../services/feedback';

interface FeedbackFilters {
  status?: string;
  priority?: string;
  category?: string;
  is_read?: boolean;
  page: number;
  limit: number;
}

interface FeedbackState {
  items: FeedbackResponse[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  filters: FeedbackFilters;
  
  // Specific Detail
  currentFeedback: FeedbackResponse | null;
  isDetailLoading: boolean;
  
  // Sidebar unread count
  unreadCount: number;
  
  // Actions
  setFilters: (filters: Partial<FeedbackFilters>) => void;
  fetchFeedback: (projectId: string) => Promise<void>;
  fetchFeedbackDetail: (projectId: string, feedbackId: string) => Promise<void>;
  updateFeedbackStatus: (projectId: string, feedbackId: string, updates: { status?: FeedbackStatus, priority?: FeedbackPriority, isRead?: boolean, reply?: string }) => Promise<void>;
  fetchUnreadCount: (projectId: string) => Promise<void>;
  reset: () => void;
}

const defaultFilters: FeedbackFilters = {
  page: 1,
  limit: 25,
};

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  items: [],
  total: 0,
  totalPages: 1,
  isLoading: false,
  filters: defaultFilters,
  
  currentFeedback: null,
  isDetailLoading: false,
  
  unreadCount: 0,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  fetchFeedback: async (projectId) => {
    set({ isLoading: true, items: [], total: 0, currentFeedback: null }); // Clear stale data
    try {
      const { filters } = get();
      const res = await feedbackService.getFeedback(projectId, filters);
      set({
        items: res.items,
        total: res.total,
        totalPages: res.pages,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
      set({ isLoading: false, items: [], total: 0 });
    }
  },
  
  fetchFeedbackDetail: async (projectId, feedbackId) => {
    set({ isDetailLoading: true });
    try {
      const feedback = await feedbackService.getFeedbackDetail(projectId, feedbackId);
      set({ currentFeedback: feedback, isDetailLoading: false });
      
      // Update local unread count if it was marked as read
      get().fetchUnreadCount(projectId);
    } catch (error) {
      console.error('Failed to fetch feedback details:', error);
      set({ isDetailLoading: false, currentFeedback: null });
    }
  },

  updateFeedbackStatus: async (projectId, feedbackId, updates) => {
    try {
      await feedbackService.updateFeedback(projectId, feedbackId, updates);
      
      // Update local state
      set((state) => ({
        items: state.items.map(f => f.id === feedbackId ? { ...f, ...updates } : f),
        currentFeedback: state.currentFeedback?.id === feedbackId 
          ? { ...state.currentFeedback, ...updates } 
          : state.currentFeedback
      }));
      
      // Refresh unread count if read status changed
      if ('isRead' in updates) {
        get().fetchUnreadCount(projectId);
      }
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  },
  
  fetchUnreadCount: async (projectId) => {
    try {
      const res = await feedbackService.getFeedback(projectId, { is_read: false, limit: 1 });
      set({ unreadCount: res.total });
    } catch (error) {
      console.error('Failed to fetch unread feedback count:', error);
    }
  },
  
  reset: () => {
    set({
      items: [],
      currentFeedback: null,
      filters: defaultFilters,
      unreadCount: 0
    });
  }
}));
