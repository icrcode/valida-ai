import { createHash } from 'crypto';

/**
 * Regras compartilhadas com o backend (backend/src/blockchain/cadeia.ts e
 * backend/src/pesquisa/conformidade.ts). Ficam duplicadas porque o chaincode é empacotado e
 * implantado de forma independente — os testes dos dois lados garantem que continuam iguais.
 *
 * Tudo aqui é determinístico: todos os peers endossantes precisam produzir o mesmo resultado.
 */

export const TIPOS_EVENTO = [
  'DOCUMENTO_SUBMETIDO',
  'DOCUMENTO_APROVADO',
  'DOCUMENTO_REPROVADO',
  'REVISAO_SOLICITADA',
  'DOCUMENTO_CANCELADO',
  'CERTIFICADO_EMITIDO',
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export type EstadoDocumento =
  | 'INICIO'
  | 'PENDENTE'
  | 'EM_REVISAO'
  | 'APROVADO'
  | 'REPROVADO'
  | 'CANCELADO'
  | 'CERTIFICADO';

/** Máquina de estados normativa — o chaincode RECUSA transições fora dela. */
export const TRANSICOES: Record<EstadoDocumento, Partial<Record<TipoEvento, EstadoDocumento>>> = {
  INICIO: { DOCUMENTO_SUBMETIDO: 'PENDENTE' },
  PENDENTE: {
    DOCUMENTO_APROVADO: 'APROVADO',
    DOCUMENTO_REPROVADO: 'REPROVADO',
    REVISAO_SOLICITADA: 'EM_REVISAO',
    DOCUMENTO_CANCELADO: 'CANCELADO',
  },
  EM_REVISAO: {
    DOCUMENTO_APROVADO: 'APROVADO',
    DOCUMENTO_REPROVADO: 'REPROVADO',
    REVISAO_SOLICITADA: 'EM_REVISAO',
  },
  APROVADO: { CERTIFICADO_EMITIDO: 'CERTIFICADO' },
  REPROVADO: {},
  CANCELADO: {},
  CERTIFICADO: {},
};

export function sha256(dados: string | Buffer): string {
  return createHash('sha256').update(dados).digest('hex');
}

export function serializarCanonico(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') {
    return JSON.stringify(valor);
  }
  if (Array.isArray(valor)) {
    return `[${valor.map(serializarCanonico).join(',')}]`;
  }
  const objeto = valor as Record<string, unknown>;
  const chaves = Object.keys(objeto)
    .filter((k) => objeto[k] !== undefined)
    .sort();
  return `{${chaves.map((k) => `${JSON.stringify(k)}:${serializarCanonico(objeto[k])}`).join(',')}}`;
}

export interface EventoEntrada {
  id: string;
  tipo: TipoEvento;
  documentoId: string;
  hashArquivo: string | null;
  dados: Record<string, unknown>;
  timestamp: string;
  sal: string;
}

export function calcularIdEvento(e: Omit<EventoEntrada, 'id'>): string {
  return sha256(
    serializarCanonico({
      tipo: e.tipo,
      documentoId: e.documentoId,
      hashArquivo: e.hashArquivo,
      dados: e.dados,
      timestamp: e.timestamp,
      sal: e.sal,
    }),
  );
}

export const HEX64 = /^[a-f0-9]{64}$/;
