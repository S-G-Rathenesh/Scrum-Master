import { create } from 'zustand';
import { type UptimeStats, type MonitoringCheck, type Incident, monitoringService } from '../services/monitoring';

interface MonitoringState {
  uptime: UptimeStats | null;
  history: MonitoringCheck[];
  incidents: Incident[];
  isLoading: boolean;
  error: string | null;
  
  fetchDashboardData: (projectId: string) => Promise<void>;
  fetchHistory: (projectId: string) => Promise<void>;
  clearData: () => void;
}

export const useMonitoringStore = create<MonitoringState>((set) => ({
  uptime: null,
  history: [],
  incidents: [],
  isLoading: false,
  error: null,

  fetchDashboardData: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [uptime, incidents, history] = await Promise.all([
        monitoringService.getUptime(projectId, 1),
        monitoringService.getIncidents(projectId),
        monitoringService.getHistory(projectId, 10) // Small history for dashboard
      ]);
      set({ uptime, incidents, history, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to fetch monitoring data', isLoading: false });
    }
  },
  
  fetchHistory: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const history = await monitoringService.getHistory(projectId, 100);
      set({ history, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to fetch monitoring history', isLoading: false });
    }
  },

  clearData: () => {
    set({ uptime: null, history: [], incidents: [], error: null });
  }
}));
