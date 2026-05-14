export type Perfil = 'estudante' | 'coordenador' | 'admin';

export type StatusDocumento =
  | 'pendente'
  | 'aprovado'
  | 'reprovado'
  | 'cancelado'
  | 'revisao_solicitada';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  matricula?: string | null;
  curso_id?: string | null;
  instituicao_id?: string | null;
  instituicao_nome?: string | null;
  ativo?: boolean;
}

export interface Documento {
  id: string;
  titulo: string;
  tipo: string;
  carga_horaria: number;
  estudante_id: string;
  curso_id: string;
  status: StatusDocumento;
  coordenador_id: string | null;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho_arquivo: number;
  mime_type: string;
  criado_em: string;
  atualizado_em: string;
}

export interface HistoricoItem {
  id: string;
  documento_id: string;
  usuario_id: string;
  acao: string;
  observacoes: string | null;
  criado_em: string;
}

export interface PaginacaoDocumentos {
  dados: Documento[];
  total: number;
  pagina: number;
  limite: number;
}

export interface FiltrosDocumento {
  status?: StatusDocumento | '';
  tipo?: string;
  estudante_id?: string;
  page?: number;
  limite?: number;
}
