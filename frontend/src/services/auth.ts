import { api } from './api';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  authProvider: string;
}

export const authService = {
  loginWithGoogle: async (credential: string) => {
    const response = await api.post('/auth/login/google', { credential });
    return response.data;
  },
  
  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};
