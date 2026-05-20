import api from './api';

export interface Instituicao {
  id: string;
  nome: string;
  sigla: string;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  site: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  dominios_email: string[];
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface CriarInstituicaoInput {
  nome: string;
  sigla: string;
  cnpj?: string;
  email_contato?: string;
  telefone?: string;
  site?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  dominios_email?: string[];
}

export type AtualizarInstituicaoInput = Partial<CriarInstituicaoInput>;

export const instituicoesService = {
  listar: (): Promise<Instituicao[]> =>
    api.get<Instituicao[]>('/api/instituicoes').then((r) => r.data),

  criar: (dados: CriarInstituicaoInput): Promise<Instituicao> =>
    api.post<Instituicao>('/api/instituicoes', dados).then((r) => r.data),

  atualizar: (id: string, dados: AtualizarInstituicaoInput): Promise<Instituicao> =>
    api.put<Instituicao>(`/api/instituicoes/${id}`, dados).then((r) => r.data),

  alterarAtiva: (id: string, ativa: boolean): Promise<Instituicao> =>
    api.patch<Instituicao>(`/api/instituicoes/${id}/ativa`, { ativa }).then((r) => r.data),
};
