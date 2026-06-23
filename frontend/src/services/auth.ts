import api from './api';
import type { Usuario } from '../types';

interface AuthResponse {
  usuario: Usuario;
}

export interface CadastroInput {
  nome: string;
  email: string;
  senha: string;
  matricula: string;
  curso_id: string;
}

export const authService = {
  login: (email: string, senha: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/api/auth/login', { email, senha }).then((r) => r.data),

  cadastrar: (dados: CadastroInput): Promise<AuthResponse> =>
    api.post<AuthResponse>('/api/auth/cadastro', dados).then((r) => r.data),

  me: (): Promise<AuthResponse> =>
    api.get<AuthResponse>('/api/auth/me').then((r) => r.data),

  logout: (): Promise<void> =>
    api.post('/api/auth/logout').then(() => undefined),
};
