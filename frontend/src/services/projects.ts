import { api } from './api';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  integrationStatus: 'PENDING' | 'CONNECTED' | 'ERROR';
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
  }
};
