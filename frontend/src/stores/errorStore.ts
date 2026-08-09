import { create } from 'zustand';
import { errorService, type ErrorGroup, type ErrorEvent, type ErrorStatus, type ErrorSeverity, type ErrorSource } from '../services/errors';

interface ErrorFilters {
  status?: ErrorStatus;
  severity?: ErrorSeverity;
  source?: ErrorSource;
  environment?: string;
  time_range: '1h' | '24h' | '7d';
  page: number;
  limit: number;
}

interface ErrorState {
  groups: ErrorGroup[];
  totalGroups: number;
  totalPages: number;
  isLoading: boolean;
  filters: ErrorFilters;
  
  // Specific Group Details
  currentGroup: ErrorGroup | null;
  currentEvents: ErrorEvent[];
  eventsTotal: number;
  eventsPage: number;
  eventsTotalPages: number;
  isEventsLoading: boolean;
  
  // Actions
  setFilters: (filters: Partial<ErrorFilters>) => void;
  fetchGroups: (projectId: string) => Promise<void>;
  fetchGroupDetails: (projectId: string, groupId: string) => Promise<void>;
  fetchGroupEvents: (projectId: string, groupId: string, page?: number) => Promise<void>;
  resolveGroup: (projectId: string, groupId: string) => Promise<void>;
  reset: () => void;
}

const defaultFilters: ErrorFilters = {
  time_range: '24h',
  page: 1,
  limit: 25,
};

export const useErrorStore = create<ErrorState>((set, get) => ({
  groups: [],
  totalGroups: 0,
  totalPages: 1,
  isLoading: false,
  filters: defaultFilters,
  
  currentGroup: null,
  currentEvents: [],
  eventsTotal: 0,
  eventsPage: 1,
  eventsTotalPages: 1,
  isEventsLoading: false,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  fetchGroups: async (projectId) => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const res = await errorService.getGroups(projectId, filters);
      set({
        groups: res.items,
        totalGroups: res.total,
        totalPages: res.pages,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch error groups:', error);
      set({ isLoading: false, groups: [], totalGroups: 0 });
    }
  },
  
  fetchGroupDetails: async (projectId, groupId) => {
    set({ isLoading: true });
    try {
      const group = await errorService.getGroupDetails(projectId, groupId);
      set({ currentGroup: group, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch error group details:', error);
      set({ isLoading: false, currentGroup: null });
    }
  },

  fetchGroupEvents: async (projectId, groupId, page = 1) => {
    set({ isEventsLoading: true });
    try {
      const res = await errorService.getGroupEvents(projectId, groupId, page, 10);
      set({
        currentEvents: res.items,
        eventsTotal: res.total,
        eventsPage: res.page,
        eventsTotalPages: res.pages,
        isEventsLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch events:', error);
      set({ isEventsLoading: false });
    }
  },

  resolveGroup: async (projectId, groupId) => {
    try {
      await errorService.resolveGroup(projectId, groupId);
      // Update local state without full refetch if possible
      set((state) => ({
        groups: state.groups.map(g => g.id === groupId ? { ...g, status: 'RESOLVED' } : g),
        currentGroup: state.currentGroup?.id === groupId 
          ? { ...state.currentGroup, status: 'RESOLVED' } 
          : state.currentGroup
      }));
    } catch (error) {
      console.error('Failed to resolve error group:', error);
    }
  },
  
  reset: () => {
    set({
      groups: [],
      currentGroup: null,
      currentEvents: [],
      filters: defaultFilters
    });
  }
}));
