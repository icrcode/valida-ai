import type { PoolClient } from 'pg';
import { pool } from '../banco/conexao';
import type { Bloco, Transacao } from './cadeia';

/**
 * Persistência da blockchain no PostgreSQL.
 *
 * - blockchain_blocos      → o bloco completo (jsonb) + colunas indexadas.
 * - blockchain_transacoes  → índice de busca por documento / hash de arquivo.
 *
 * As tabelas são append-only: triggers no banco (ver migration 006) bloqueiam UPDATE e DELETE.
 * Mesmo que alguém altere o jsonb diretamente, a validação da cadeia detecta a adulteração.
 */

export interface LocalizacaoTransacao {
  transacao: Transacao;
  altura: number;
  indice: number;
}

export async function buscarUltimoBloco(cliente: PoolClient | typeof pool = pool): Promise<Bloco | null> {
  const res = await cliente.query(
    'SELECT conteudo FROM blockchain_blocos ORDER BY altura DESC LIMIT 1',
  );
  return (res.rows[0]?.conteudo as Bloco) ?? null;
}

export async function buscarBloco(altura: number): Promise<Bloco | null> {
  const res = await pool.query('SELECT conteudo FROM blockchain_blocos WHERE altura = $1', [altura]);
  return (res.rows[0]?.conteudo as Bloco) ?? null;
}

export async function buscarBlocoPorHash(hash: string): Promise<Bloco | null> {
  const res = await pool.query('SELECT conteudo FROM blockchain_blocos WHERE hash = $1', [hash]);
  return (res.rows[0]?.conteudo as Bloco) ?? null;
}

export async function listarTodos(): Promise<Bloco[]> {
  const res = await pool.query('SELECT conteudo FROM blockchain_blocos ORDER BY altura ASC');
  return res.rows.map((r) => r.conteudo as Bloco);
}

export async function listarPaginado(
  pagina: number,
  limite: number,
): Promise<{ dados: Bloco[]; total: number }> {
  const offset = (pagina - 1) * limite;
  const [total, dados] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM blockchain_blocos'),
    pool.query(
      'SELECT conteudo FROM blockchain_blocos ORDER BY altura DESC LIMIT $1 OFFSET $2',
      [limite, offset],
    ),
  ]);
  return {
    total: Number.parseInt(total.rows[0].count as string, 10),
    dados: dados.rows.map((r) => r.conteudo as Bloco),
  };
}

/**
 * Insere o bloco e indexa suas transações numa única transação SQL.
 * A PK em `altura` impede que dois blocos disputem a mesma posição (fork local).
 */
export async function inserirBloco(cliente: PoolClient, bloco: Bloco): Promise<void> {
  await cliente.query(
    `INSERT INTO blockchain_blocos (altura, hash, hash_anterior, conteudo)
     VALUES ($1, $2, $3, $4)`,
    [bloco.altura, bloco.hash, bloco.hashAnterior, JSON.stringify(bloco)],
  );

  for (const [indice, tx] of bloco.transacoes.entries()) {
    await cliente.query(
      `INSERT INTO blockchain_transacoes
         (id, bloco_altura, indice, tipo, documento_id, hash_arquivo, registrado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tx.id, bloco.altura, indice, tx.tipo, tx.documentoId, tx.hashArquivo, tx.timestamp],
    );
  }
}

async function localizar(where: string, valor: string): Promise<LocalizacaoTransacao[]> {
  const res = await pool.query(
    `SELECT t.bloco_altura, t.indice, b.conteudo
       FROM blockchain_transacoes t
       JOIN blockchain_blocos b ON b.altura = t.bloco_altura
      WHERE ${where} = $1
      ORDER BY t.bloco_altura ASC, t.indice ASC`,
    [valor],
  );
  return res.rows.map((r) => {
    const bloco = r.conteudo as Bloco;
    const indice = r.indice as number;
    return { transacao: bloco.transacoes[indice], altura: r.bloco_altura as number, indice };
  });
}

export function buscarTransacoesPorDocumento(documentoId: string): Promise<LocalizacaoTransacao[]> {
  return localizar('t.documento_id', documentoId);
}

export function buscarTransacoesPorHashArquivo(hashArquivo: string): Promise<LocalizacaoTransacao[]> {
  return localizar('t.hash_arquivo', hashArquivo);
}

export function buscarTransacaoPorId(id: string): Promise<LocalizacaoTransacao[]> {
  return localizar('t.id', id);
}

export async function obterClienteComBloqueio(): Promise<PoolClient> {
  const cliente = await pool.connect();
  // Advisory lock: garante um único minerador por vez, mesmo com várias instâncias da API.
  await cliente.query('BEGIN');
  await cliente.query("SELECT pg_advisory_xact_lock(hashtext('valida_blockchain'))");
  return cliente;
}

/** Traço (sequência de tipos de evento) de cada documento registrado na cadeia. */
export async function listarTracosDocumentos(
  limite: number,
): Promise<{ documento_id: string; tipos: string[] }[]> {
  const res = await pool.query(
    `SELECT documento_id, array_agg(tipo ORDER BY bloco_altura, indice) AS tipos
       FROM blockchain_transacoes
      WHERE documento_id IS NOT NULL
      GROUP BY documento_id
      ORDER BY MIN(registrado_em) DESC
      LIMIT $1`,
    [limite],
  );
  return res.rows as { documento_id: string; tipos: string[] }[];
}
