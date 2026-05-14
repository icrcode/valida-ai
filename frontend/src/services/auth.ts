import api from './api';
import type { Usuario } from '../types';

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export const authService = {
  login: (email: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/api/auth/login', { email }).then((r) => r.data),
};
