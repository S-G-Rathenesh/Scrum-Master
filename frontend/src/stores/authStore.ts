import { create } from 'zustand';
import { type User, authService } from '../services/auth';
import { useProjectStore } from './projectStore';
import { useAnalyticsStore } from './analyticsStore';
import { useErrorStore } from './errorStore';
import { useFeedbackStore } from './feedbackStore';
import { useMonitoringStore } from './monitoringStore';
import { useNotificationStore } from './notificationStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (credential: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: localStorage.getItem('token'),
  
  login: async (credential: string) => {
    try {
      const { access_token } = await authService.loginWithGoogle(credential);
      localStorage.setItem('token', access_token);
      set({ token: access_token, isAuthenticated: true });
      
      const user = await authService.getMe();
      set({ user });
    } catch (error) {
      localStorage.removeItem('token');
      set({ token: null, isAuthenticated: false, user: null });
      throw error;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    useProjectStore.getState().clearStore();
    useAnalyticsStore.getState().clearStore();
    useErrorStore.getState().reset();
    useFeedbackStore.getState().reset();
    useMonitoringStore.getState().clearData();
    useNotificationStore.getState().clearNotifications();
    set({ user: null, isAuthenticated: false, token: null });
  },
  
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isAuthenticated: false, user: null, isLoading: false });
        return;
      }
      
      const user = await authService.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, isAuthenticated: false, token: null, isLoading: false });
    }
  }
}));
