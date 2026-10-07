import axios from 'axios';

// Endpoints públicos: usam axios direto (sem o interceptor de 401 do `api`)
const cliente = axios.create({ baseURL: import.meta.env.VITE_API_URL || '', timeout: 30_000 });

export type TipoTransacao =
  | 'GENESIS'
  | 'DOCUMENTO_SUBMETIDO'
  | 'DOCUMENTO_APROVADO'
  | 'DOCUMENTO_REPROVADO'
  | 'REVISAO_SOLICITADA'
  | 'DOCUMENTO_CANCELADO'
  | 'CERTIFICADO_EMITIDO';

export interface Transacao {
  id: string;
  tipo: TipoTransacao;
  documentoId: string | null;
  hashArquivo: string | null;
  dados: Record<string, unknown>;
  timestamp: string;
  sal: string;
}

export interface Bloco {
  altura: number;
  timestamp: string;
  hashAnterior: string;
  raizMerkle: string;
  dificuldade: number;
  nonce: number;
  validador: string;
  hash: string;
  assinatura: string;
  transacoes: Transacao[];
}

export interface StatusBlockchain {
  altura: number;
  ultimoHash: string | null;
  hashGenese: string | null;
  dificuldade: number;
  validadorDesteNo: string;
  validadoresAutorizados: string[];
  transacoesPendentes: number;
}

export interface ResultadoValidacao {
  valida: boolean;
  blocosVerificados: number;
  erros: { altura: number; motivo: string }[];
}

export interface ProvaInclusao {
  transacao: Transacao;
  bloco: {
    altura: number;
    hash: string;
    hashAnterior: string;
    raizMerkle: string;
    timestamp: string;
    validador: string;
    assinatura: string;
  };
  provaMerkle: { hash: string; posicao: 'esquerda' | 'direita' }[];
  provaValida: boolean;
  confirmacoes: number;
}

export const ROTULO_TRANSACAO: Record<TipoTransacao, string> = {
  GENESIS: 'Gênese',
  DOCUMENTO_SUBMETIDO: 'Documento submetido',
  DOCUMENTO_APROVADO: 'Documento aprovado',
  DOCUMENTO_REPROVADO: 'Documento reprovado',
  REVISAO_SOLICITADA: 'Revisão solicitada',
  DOCUMENTO_CANCELADO: 'Documento cancelado',
  CERTIFICADO_EMITIDO: 'Certificado emitido',
};

/** SHA-256 calculado no navegador — o arquivo nunca sai do computador do usuário. */
export async function calcularSha256(arquivo: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await arquivo.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const blockchainService = {
  status: (): Promise<StatusBlockchain> =>
    cliente.get<StatusBlockchain>('/api/blockchain/status').then((r) => r.data),

  validar: (): Promise<ResultadoValidacao> =>
    cliente.get<ResultadoValidacao>('/api/blockchain/validar').then((r) => r.data),

  listarBlocos: (pagina = 1, limite = 10): Promise<{ dados: Bloco[]; total: number; pagina: number; limite: number }> =>
    cliente.get('/api/blockchain/blocos', { params: { pagina, limite } }).then((r) => r.data),

  buscarPorHashArquivo: (
    hash: string,
  ): Promise<{ hashArquivo: string; registrado: boolean; provas: ProvaInclusao[] }> =>
    cliente.get(`/api/blockchain/arquivos/${hash}`).then((r) => r.data),

  historicoDocumento: (
    documentoId: string,
  ): Promise<{ documentoId: string; registrado: boolean; historico: ProvaInclusao[] }> =>
    cliente.get(`/api/blockchain/documentos/${documentoId}`).then((r) => r.data),
};
