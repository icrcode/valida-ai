import crypto from 'node:crypto';
import {
  sha256,
  serializarCanonico,
  assinar,
  verificarAssinatura,
  type ParDeChaves,
} from './criptografia';
import { calcularRaizMerkle } from './merkle';

/**
 * Núcleo da blockchain de documentos (funções puras, sem banco de dados).
 *
 * Modelo de segurança (permissionada, adequada a uma instituição de ensino):
 *  1. Encadeamento por hash  — cada bloco guarda o hash do anterior; alterar qualquer
 *     bloco quebra todos os seguintes.
 *  2. Árvore de Merkle       — a raiz no cabeçalho "sela" todas as transações do bloco.
 *  3. Proof of Work          — o hash do cabeçalho precisa começar com N zeros, encarecendo
 *     a reescrita do histórico.
 *  4. Proof of Authority     — cada bloco é assinado (Ed25519) por um validador listado no
 *     bloco gênese; blocos de chaves desconhecidas são rejeitados.
 */

export const HASH_ZERO = '0'.repeat(64);

export type TipoTransacao =
  | 'GENESIS'
  | 'DOCUMENTO_SUBMETIDO'
  | 'DOCUMENTO_APROVADO'
  | 'DOCUMENTO_REPROVADO'
  | 'REVISAO_SOLICITADA'
  | 'DOCUMENTO_CANCELADO'
  | 'CERTIFICADO_EMITIDO';

export interface Transacao {
  /** SHA-256 do conteúdo canônico da transação (sem o próprio id). */
  id: string;
  tipo: TipoTransacao;
  documentoId: string | null;
  /** SHA-256 do arquivo (PDF) a que a transação se refere, quando houver. */
  hashArquivo: string | null;
  dados: Record<string, unknown>;
  timestamp: string;
  /** Valor aleatório: garante ids distintos para eventos idênticos no mesmo milissegundo. */
  sal: string;
}

export interface CabecalhoBloco {
  altura: number;
  timestamp: string;
  hashAnterior: string;
  raizMerkle: string;
  dificuldade: number;
  nonce: number;
  /** Chave pública (base64) do validador que produziu o bloco. */
  validador: string;
}

export interface Bloco extends CabecalhoBloco {
  hash: string;
  /** Assinatura Ed25519 do validador sobre o hash do bloco. */
  assinatura: string;
  transacoes: Transacao[];
}

export interface ErroValidacao {
  altura: number;
  motivo: string;
}

export interface ResultadoValidacao {
  valida: boolean;
  blocosVerificados: number;
  erros: ErroValidacao[];
}

// ───────────────────────── Transações ─────────────────────────

export function calcularIdTransacao(tx: Omit<Transacao, 'id'>): string {
  return sha256(
    serializarCanonico({
      tipo: tx.tipo,
      documentoId: tx.documentoId,
      hashArquivo: tx.hashArquivo,
      dados: tx.dados,
      timestamp: tx.timestamp,
      sal: tx.sal,
    }),
  );
}

export function criarTransacao(entrada: {
  tipo: TipoTransacao;
  documentoId?: string | null;
  hashArquivo?: string | null;
  dados?: Record<string, unknown>;
  timestamp?: Date;
}): Transacao {
  const semId: Omit<Transacao, 'id'> = {
    tipo: entrada.tipo,
    documentoId: entrada.documentoId ?? null,
    hashArquivo: entrada.hashArquivo ?? null,
    dados: entrada.dados ?? {},
    timestamp: (entrada.timestamp ?? new Date()).toISOString(),
    sal: crypto.randomBytes(8).toString('hex'),
  };
  return { id: calcularIdTransacao(semId), ...semId };
}

// ───────────────────────── Blocos ─────────────────────────

export function calcularHashBloco(cabecalho: CabecalhoBloco): string {
  return sha256(
    serializarCanonico({
      altura: cabecalho.altura,
      timestamp: cabecalho.timestamp,
      hashAnterior: cabecalho.hashAnterior,
      raizMerkle: cabecalho.raizMerkle,
      dificuldade: cabecalho.dificuldade,
      nonce: cabecalho.nonce,
      validador: cabecalho.validador,
    }),
  );
}

export function atendeDificuldade(hash: string, dificuldade: number): boolean {
  return hash.startsWith('0'.repeat(dificuldade));
}

/**
 * Monta, minera (PoW) e assina um novo bloco.
 */
export function minerarBloco(entrada: {
  altura: number;
  hashAnterior: string;
  transacoes: Transacao[];
  dificuldade: number;
  validador: ParDeChaves;
  timestamp?: Date;
}): Bloco {
  const cabecalho: CabecalhoBloco = {
    altura: entrada.altura,
    timestamp: (entrada.timestamp ?? new Date()).toISOString(),
    hashAnterior: entrada.hashAnterior,
    raizMerkle: calcularRaizMerkle(entrada.transacoes.map((t) => t.id)),
    dificuldade: entrada.dificuldade,
    nonce: 0,
    validador: entrada.validador.chavePublica,
  };

  let hash = calcularHashBloco(cabecalho);
  while (!atendeDificuldade(hash, cabecalho.dificuldade)) {
    cabecalho.nonce += 1;
    hash = calcularHashBloco(cabecalho);
  }

  return {
    ...cabecalho,
    hash,
    assinatura: assinar(hash, entrada.validador.chavePrivada),
    transacoes: entrada.transacoes,
  };
}

/**
 * Bloco 0: registra a rede e a lista de validadores autorizados a assinar blocos.
 */
export function criarBlocoGenese(
  validador: ParDeChaves,
  dificuldade: number,
  validadoresAutorizados: string[] = [validador.chavePublica],
): Bloco {
  const tx = criarTransacao({
    tipo: 'GENESIS',
    dados: {
      rede: 'valida-ai',
      descricao: 'Registro imutável de documentos acadêmicos',
      validadores: [...new Set([validador.chavePublica, ...validadoresAutorizados])].sort(),
    },
  });
  return minerarBloco({
    altura: 0,
    hashAnterior: HASH_ZERO,
    transacoes: [tx],
    dificuldade,
    validador,
  });
}

export function obterValidadoresAutorizados(genese: Bloco): string[] {
  const tx = genese.transacoes.find((t) => t.tipo === 'GENESIS');
  const lista = tx?.dados.validadores;
  return Array.isArray(lista) ? lista.filter((v): v is string => typeof v === 'string') : [];
}

// ───────────────────────── Validação ─────────────────────────

/**
 * Valida um bloco isoladamente e em relação ao anterior. Retorna a lista de problemas.
 */
export function validarBloco(
  bloco: Bloco,
  anterior: Bloco | null,
  validadoresAutorizados: string[],
): string[] {
  const erros: string[] = [];

  for (const tx of bloco.transacoes) {
    const { id, ...semId } = tx;
    if (calcularIdTransacao(semId) !== id) {
      erros.push(`transação ${id.slice(0, 12)}… foi adulterada (id não confere com o conteúdo)`);
    }
  }

  const raiz = calcularRaizMerkle(bloco.transacoes.map((t) => t.id));
  if (raiz !== bloco.raizMerkle) {
    erros.push('raiz de Merkle não confere com as transações');
  }

  const hash = calcularHashBloco(bloco);
  if (hash !== bloco.hash) {
    erros.push('hash do bloco não confere com o cabeçalho');
  }

  if (!atendeDificuldade(bloco.hash, bloco.dificuldade)) {
    erros.push(`hash não atende a dificuldade ${bloco.dificuldade} (proof of work inválido)`);
  }

  if (!verificarAssinatura(bloco.hash, bloco.assinatura, bloco.validador)) {
    erros.push('assinatura digital do validador inválida');
  }

  if (!validadoresAutorizados.includes(bloco.validador)) {
    erros.push('bloco assinado por validador não autorizado');
  }

  if (anterior === null) {
    if (bloco.altura !== 0) erros.push('primeiro bloco deveria ter altura 0');
    if (bloco.hashAnterior !== HASH_ZERO) erros.push('bloco gênese com hashAnterior inválido');
  } else {
    if (bloco.altura !== anterior.altura + 1) {
      erros.push(`altura esperada ${anterior.altura + 1}, encontrada ${bloco.altura}`);
    }
    if (bloco.hashAnterior !== anterior.hash) {
      erros.push('hashAnterior não aponta para o bloco anterior (cadeia quebrada)');
    }
    if (Date.parse(bloco.timestamp) < Date.parse(anterior.timestamp)) {
      erros.push('timestamp anterior ao do bloco precedente');
    }
  }

  return erros;
}

export function validarCadeia(blocos: Bloco[]): ResultadoValidacao {
  if (blocos.length === 0) {
    return { valida: true, blocosVerificados: 0, erros: [] };
  }

  const autorizados = obterValidadoresAutorizados(blocos[0]);
  const erros: ErroValidacao[] = [];

  blocos.forEach((bloco, i) => {
    const anterior = i === 0 ? null : blocos[i - 1];
    for (const motivo of validarBloco(bloco, anterior, autorizados)) {
      erros.push({ altura: bloco.altura, motivo });
    }
  });

  return { valida: erros.length === 0, blocosVerificados: blocos.length, erros };
}
