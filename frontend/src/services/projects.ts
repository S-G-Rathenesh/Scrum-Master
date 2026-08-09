import { api } from './api';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  integrationStatus: 'WAITING' | 'CONNECTED' | 'DISCONNECTED' | 'REVOKED';
  monitoringStatus: 'up' | 'degraded' | 'down' | 'unknown';
  monitoringEnabled?: boolean;
  monitoringInterval?: number;
  requestTimeout?: number;
  frontendUrl?: string;
  backendUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastConnectedAt?: string;
}

export interface IntegrationStatusResponse {
  status: 'WAITING' | 'CONNECTED' | 'DISCONNECTED' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
  lastHeartbeatAt?: string;
  connectedAt?: string;
  revokedAt?: string;
  agentVersion?: string;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  frontendUrl?: string;
  backendUrl?: string;
}

export const projectService = {
  getProjects: async (): Promise<Project[]> => {
    const response = await api.get('/projects');
    return response.data;
  },
  
  getProject: async (id: string): Promise<Project> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
  
  createProject: async (data: CreateProjectDTO): Promise<Project> => {
    const response = await api.post('/projects', data);
    return response.data;
  },
  
  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  },

  getIntegrationStatus: async (projectId: string): Promise<IntegrationStatusResponse> => {
    const response = await api.get(`/projects/${projectId}/integration/status`);
    return response.data;
  },

  generateIntegrationToken: async (projectId: string): Promise<{ token: string }> => {
    const response = await api.post(`/projects/${projectId}/integration/generate`);
    return response.data;
  },

  regenerateIntegrationToken: async (projectId: string): Promise<{ token: string }> => {
    const response = await api.post(`/projects/${projectId}/integration/regenerate`);
    return response.data;
  },

  revokeIntegration: async (projectId: string): Promise<void> => {
    await api.post(`/projects/${projectId}/integration/revoke`);
  }
};
