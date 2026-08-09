import { api } from './api';

export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type ErrorSource = 'frontend' | 'backend' | 'api' | 'integration';
export type ErrorStatus = 'NEW' | 'ONGOING' | 'RESOLVED';

export interface ErrorGroup {
  id: string;
  projectId: string;
  fingerprint: string;
  errorType: string;
  message: string;
  severity: ErrorSeverity;
  source: ErrorSource;
  environment: string;
  endpoint?: string;
  status: ErrorStatus;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
}

export interface ErrorEvent {
  id: string;
  groupId: string;
  projectId: string;
  errorType: string;
  message: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  stackTrace?: string;
  timestamp: string;
}

export interface ErrorGroupListResponse {
  items: ErrorGroup[];
  total: number;
  page: number;
  pages: number;
}

export interface ErrorEventListResponse {
  items: ErrorEvent[];
  total: number;
  page: number;
  pages: number;
}

export const errorService = {
  getGroups: async (
    projectId: string,
    params: {
      page?: number;
      limit?: number;
      status?: ErrorStatus;
      severity?: ErrorSeverity;
      source?: ErrorSource;
      environment?: string;
      time_range?: '1h' | '24h' | '7d';
    } = {}
  ): Promise<ErrorGroupListResponse> => {
    const response = await api.get(`/projects/${projectId}/errors`, { params });
    return response.data;
  },

  getGroupDetails: async (projectId: string, groupId: string): Promise<ErrorGroup> => {
    const response = await api.get(`/projects/${projectId}/errors/${groupId}`);
    return response.data;
  },

  getGroupEvents: async (
    projectId: string,
    groupId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ErrorEventListResponse> => {
    const response = await api.get(`/projects/${projectId}/errors/${groupId}/events`, {
      params: { page, limit },
    });
    return response.data;
  },

  resolveGroup: async (projectId: string, groupId: string): Promise<void> => {
    await api.patch(`/projects/${projectId}/errors/${groupId}/resolve`);
  }
};
