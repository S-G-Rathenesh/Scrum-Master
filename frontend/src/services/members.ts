import { api } from './api';

export interface Member {
  id: string;
  projectId: string;
  email: string;
  accessLevel: string;
  status: string;
  createdAt: string;
}

export const membersService = {
  getMembers: async (projectId: string): Promise<Member[]> => {
    const response = await api.get(`/projects/${projectId}/members`);
    return response.data;
  },

  addMember: async (projectId: string, email: string, accessLevel: string): Promise<Member> => {
    const response = await api.post(`/projects/${projectId}/members`, { email, accessLevel });
    return response.data;
  },

  revokeMember: async (projectId: string, memberId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
  }
};
