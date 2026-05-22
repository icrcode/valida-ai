import api from './api';
import type { Perfil, Usuario } from '../types';

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil;
  matricula?: string;
  curso_id?: string;
}

export interface AtualizarUsuarioInput {
  nome?: string;
  email?: string;
  matricula?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  curso_id?: string | null;
  perfil?: Perfil;
}

export interface AtualizarPerfilInput {
  nome?: string;
  email?: string;
  matricula?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  senha_atual?: string;
  nova_senha?: string;
}

export const usuariosService = {
  getPerfil: (): Promise<Usuario> => api.get<Usuario>('/api/usuarios/perfil').then((r) => r.data),

  atualizarPerfil: (dados: AtualizarPerfilInput): Promise<Usuario> =>
    api.put<Usuario>('/api/usuarios/perfil', dados).then((r) => r.data),

  // mantido para compatibilidade com código existente
  atualizarNome: (nome: string): Promise<Usuario> =>
    api.put<Usuario>('/api/usuarios/perfil', { nome }).then((r) => r.data),

  listar: (instituicao_id?: string): Promise<Usuario[]> =>
    api
      .get<Usuario[]>('/api/usuarios', { params: instituicao_id ? { instituicao_id } : undefined })
      .then((r) => r.data),

  criar: (dados: CriarUsuarioInput): Promise<Usuario> =>
    api.post<Usuario>('/api/usuarios', dados).then((r) => r.data),

  atualizar: (id: string, dados: AtualizarUsuarioInput): Promise<Usuario> =>
    api.put<Usuario>(`/api/usuarios/${id}`, dados).then((r) => r.data),

  alterarAtivo: (id: string, ativo: boolean): Promise<Usuario> =>
    api.patch<Usuario>(`/api/usuarios/${id}/ativo`, { ativo }).then((r) => r.data),
};
