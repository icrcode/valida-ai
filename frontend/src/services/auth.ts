import api from './api';
import type { Usuario } from '../types';

interface LoginResponse {
  token: string;
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
  login: (email: string, senha: string): Promise<LoginResponse> =>
    api.post<LoginResponse>('/api/auth/login', { email, senha }).then((r) => r.data),

  cadastrar: (dados: CadastroInput): Promise<LoginResponse> =>
    api.post<LoginResponse>('/api/auth/cadastro', dados).then((r) => r.data),
};
