import { create } from 'zustand';
import { api } from '../services/api';

export type TimeRange = '24h' | '7d' | '30d';

export interface UptimeTrendPoint {
  timestamp: string;
  uptimePercentage: number;
  latencyMs: number;
}

export interface UptimeAnalytics {
  uptimePercentage: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  trend: UptimeTrendPoint[];
  hasData: boolean;
}

export interface LatencyAnalytics {
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  trend: UptimeTrendPoint[];
}

export interface IncidentAnalytics {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  averageDurationMinutes: number;
  totalDowntimeMinutes: number;
}

export interface TopErrorGroup {
  id: string;
  fingerprint: string;
  occurrenceCount: number;
  severity: string;
}

export interface ErrorAnalytics {
  totalOccurrences: number;
  uniqueGroups: number;
  newErrors: number;
  resolvedErrors: number;
  criticalErrors: number;
  topErrors: TopErrorGroup[];
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  newFeedback: number;
  unreadFeedback: number;
  resolvedFeedback: number;
  categoryBreakdown: Record<string, number>;
}

export interface HealthAnalytics {
  score: number;
  status: 'Healthy' | 'Degraded' | 'Critical' | 'Collecting data';
}

export interface AnalyticsOverview {
  projectId: string;
  timeRange: string;
  health: HealthAnalytics;
  uptime: UptimeAnalytics;
  performance: LatencyAnalytics;
  incidents: IncidentAnalytics;
  errors: ErrorAnalytics;
  feedback: FeedbackAnalytics;
}

interface AnalyticsState {
  overview: AnalyticsOverview | null;
  timeRange: TimeRange;
  isLoading: boolean;
  error: string | null;
  
  setTimeRange: (range: TimeRange, projectId: string) => void;
  fetchAnalytics: (projectId: string) => Promise<void>;
  clearAnalytics: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  overview: null,
  timeRange: '24h',
  isLoading: false,
  error: null,

  setTimeRange: (range: TimeRange, projectId: string) => {
    set({ timeRange: range });
    get().fetchAnalytics(projectId);
  },

  clearAnalytics: () => {
    set({ overview: null, error: null });
  },

  fetchAnalytics: async (projectId: string) => {
    if (!projectId) return;
    
    set({ isLoading: true, error: null, overview: null }); // Clear previous overview
    try {
      const timeRange = get().timeRange;
      const response = await api.get(`/projects/${projectId}/analytics/overview?timeRange=${timeRange}`);
      set({ overview: response.data, isLoading: false });
    } catch (err: any) {
      set({ 
        error: err.response?.data?.detail || 'Failed to fetch analytics', 
        isLoading: false,
        overview: null 
      });
    }
  }
}));
