import api from './api';
import type { Usuario } from '../types';

interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export const authService = {
  loginDev: (email: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/api/auth/login-dev', { email }).then((r) => r.data),
};
