import api from './api';
import type { Usuario } from '../types';

export const usuariosService = {
  getPerfil: (): Promise<Usuario> => api.get<Usuario>('/api/usuarios/perfil').then((r) => r.data),

  atualizarNome: (nome: string): Promise<Usuario> =>
    api.put<Usuario>('/api/usuarios/perfil', { nome }).then((r) => r.data),

  listar: (): Promise<Usuario[]> => api.get<Usuario[]>('/api/usuarios').then((r) => r.data),
};
