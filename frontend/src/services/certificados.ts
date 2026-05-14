import api from './api';
import type { Documento } from '../types';

export interface Certificado {
  id: string;
  documento_id: string;
  estudante_id: string;
  hash: string;
  caminho_arquivo: string;
  criado_em: string;
  documento?: Documento | null;
}

export const certificadosService = {
  listar: (): Promise<Certificado[]> =>
    api.get<Certificado[]>('/api/certificados').then((r) => r.data),

  buscarPorId: (id: string): Promise<Certificado> =>
    api.get<Certificado>(`/api/certificados/${id}`).then((r) => r.data),

  buscarUrlDownload: (id: string): Promise<{ url: string; expira_em: string }> =>
    api
      .get<{ url: string; expira_em: string }>(`/api/certificados/${id}/download`)
      .then((r) => r.data),
};
