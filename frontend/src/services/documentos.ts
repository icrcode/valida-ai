import api from './api';
import type { Documento, FiltrosDocumento, HistoricoItem, PaginacaoDocumentos } from '../types';

export const documentosService = {
  listar: (filtros: FiltrosDocumento = {}): Promise<PaginacaoDocumentos> => {
    const params: Record<string, string | number> = {};
    if (filtros.status) params.status = filtros.status;
    if (filtros.tipo) params.tipo = filtros.tipo;
    if (filtros.estudante_id) params.estudante_id = filtros.estudante_id;
    if (filtros.curso_id) params.curso_id = filtros.curso_id;
    if (filtros.page) params.page = filtros.page;
    if (filtros.limite) params.limite = filtros.limite;
    return api.get<PaginacaoDocumentos>('/api/documentos', { params }).then((r) => r.data);
  },

  buscarPorId: (id: string): Promise<Documento> =>
    api.get<Documento>(`/api/documentos/${id}`).then((r) => r.data),

  buscarUrlDownload: (id: string): Promise<{ url: string; expira_em: string }> =>
    api
      .get<{ url: string; expira_em: string }>(`/api/documentos/${id}/download`)
      .then((r) => r.data),

  submeter: (dados: FormData): Promise<Documento> =>
    api
      .post<Documento>('/api/documentos', dados, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  cancelar: (id: string): Promise<void> =>
    api.delete(`/api/documentos/${id}`).then((r) => r.data),

  aprovar: (id: string, observacoes?: string): Promise<Documento> =>
    api.patch<Documento>(`/api/documentos/${id}/aprovar`, { observacoes }).then((r) => r.data),

  reprovar: (id: string, observacoes: string): Promise<Documento> =>
    api.patch<Documento>(`/api/documentos/${id}/reprovar`, { observacoes }).then((r) => r.data),

  solicitarRevisao: (id: string, observacoes: string): Promise<Documento> =>
    api
      .patch<Documento>(`/api/documentos/${id}/solicitar-revisao`, { observacoes })
      .then((r) => r.data),

  historico: (id: string): Promise<HistoricoItem[]> =>
    api.get<HistoricoItem[]>(`/api/documentos/${id}/historico`).then((r) => r.data),
};
