import { api } from './api';

export interface UptimeStats {
  uptimePercent: number;
  totalChecks: number;
  failedChecks: number;
  avgResponseTime: number;
}

export interface MonitoringCheck {
  id: string;
  projectId: string;
  target: 'frontend' | 'backend';
  status: 'up' | 'degraded' | 'down' | 'unknown';
  statusCode: number | null;
  responseTime: number | null;
  errorType: string | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface Incident {
  id: string;
  projectId: string;
  target: string;
  status: 'open' | 'resolved';
  startedAt: string;
  resolvedAt: string | null;
  failureCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringUpdate {
  monitoringEnabled?: boolean;
  monitoringInterval?: number;
  frontendUrl?: string;
  backendUrl?: string;
}

export const monitoringService = {
  updateSettings: async (projectId: string, data: MonitoringUpdate): Promise<void> => {
    await api.patch(`/projects/${projectId}/monitoring`, data);
  },

  getHistory: async (projectId: string, limit: number = 50): Promise<MonitoringCheck[]> => {
    const response = await api.get(`/projects/${projectId}/monitoring/history`, { params: { limit } });
    return response.data;
  },

  getIncidents: async (projectId: string): Promise<Incident[]> => {
    const response = await api.get(`/projects/${projectId}/incidents`);
    return response.data;
  },

  getUptime: async (projectId: string, days: number = 1): Promise<UptimeStats> => {
    const response = await api.get(`/projects/${projectId}/uptime`, { params: { days } });
    return response.data;
  }
};
