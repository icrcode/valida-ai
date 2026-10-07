import type { PoolClient } from 'pg';
import { pool } from '../../banco/conexao';
import type { Bloco, Transacao } from '../cadeia';

/**
 * Transactional Outbox para o Hyperledger Fabric.
 *
 * O bloco da cadeia própria e as mensagens para o Fabric são gravados NA MESMA transação SQL.
 * Assim nunca existe bloco sem a respectiva pendência (nem o contrário), mesmo se a API cair
 * entre um passo e outro. O sincronizador lê a tabela e entrega ao Fabric com reenvio
 * (entrega "at-least-once"); a idempotência do chaincode (EVENTO_DUPLICADO) torna o efeito
 * "exactly-once".
 */

export type TipoMensagem = 'evento' | 'checkpoint';
export type StatusMensagem = 'pendente' | 'confirmado' | 'rejeitado';

export interface MensagemOutbox {
  id: string;
  tipo: TipoMensagem;
  referencia: string;
  carga: Transacao | { altura: number; hashBloco: string };
  status: StatusMensagem;
  tentativas: number;
  fabric_tx_id: string | null;
  ultimo_erro: string | null;
}

export async function enfileirarBloco(cliente: PoolClient, bloco: Bloco, checkpointACada: number): Promise<void> {
  for (const tx of bloco.transacoes) {
    if (tx.tipo === 'GENESIS' || !tx.documentoId) continue;
    await cliente.query(
      `INSERT INTO fabric_outbox (tipo, referencia, carga) VALUES ('evento', $1, $2)
       ON CONFLICT (tipo, referencia) DO NOTHING`,
      [tx.id, JSON.stringify(tx)],
    );
  }
  if (bloco.altura % checkpointACada === 0) {
    await cliente.query(
      `INSERT INTO fabric_outbox (tipo, referencia, carga) VALUES ('checkpoint', $1, $2)
       ON CONFLICT (tipo, referencia) DO NOTHING`,
      [String(bloco.altura), JSON.stringify({ altura: bloco.altura, hashBloco: bloco.hash })],
    );
  }
}

/** Próximas mensagens prontas, em ordem de criação (preserva a ordem causal por documento). */
export async function buscarProntas(limite: number): Promise<MensagemOutbox[]> {
  const res = await pool.query(
    `SELECT id, tipo, referencia, carga, status, tentativas, fabric_tx_id, ultimo_erro
       FROM fabric_outbox
      WHERE status = 'pendente'
      ORDER BY id ASC
      LIMIT $1`,
    [limite],
  );
  return res.rows as MensagemOutbox[];
}

export async function marcarConfirmada(id: string, fabricTxId: string | null, observacao?: string): Promise<void> {
  await pool.query(
    `UPDATE fabric_outbox
        SET status = 'confirmado', fabric_tx_id = $2, ultimo_erro = $3, tentativas = tentativas + 1, atualizado_em = now()
      WHERE id = $1`,
    [id, fabricTxId, observacao ?? null],
  );
}

export async function marcarRejeitada(id: string, erro: string): Promise<void> {
  await pool.query(
    `UPDATE fabric_outbox
        SET status = 'rejeitado', ultimo_erro = $2, tentativas = tentativas + 1, atualizado_em = now()
      WHERE id = $1`,
    [id, erro],
  );
}

/** Falha transitória: backoff exponencial (2^n s, máx. 5 min). */
export async function agendarNovaTentativa(id: string, erro: string): Promise<void> {
  await pool.query(
    `UPDATE fabric_outbox
        SET tentativas = tentativas + 1,
            ultimo_erro = $2,
            proxima_tentativa = now() + make_interval(secs => LEAST(300, power(2, tentativas + 1))),
            atualizado_em = now()
      WHERE id = $1`,
    [id, erro],
  );
}

export async function proximaTentativaLiberada(): Promise<boolean> {
  const res = await pool.query(
    `SELECT proxima_tentativa <= now() AS liberada
       FROM fabric_outbox WHERE status = 'pendente' ORDER BY id ASC LIMIT 1`,
  );
  return res.rows.length === 0 || (res.rows[0].liberada as boolean);
}

export async function contarPorStatus(): Promise<Record<StatusMensagem, number>> {
  const res = await pool.query('SELECT status, COUNT(*)::int AS n FROM fabric_outbox GROUP BY status');
  const contagem: Record<StatusMensagem, number> = { pendente: 0, confirmado: 0, rejeitado: 0 };
  for (const r of res.rows) contagem[r.status as StatusMensagem] = r.n as number;
  return contagem;
}

export async function listarRejeitadas(limite = 50): Promise<MensagemOutbox[]> {
  const res = await pool.query(
    `SELECT id, tipo, referencia, carga, status, tentativas, fabric_tx_id, ultimo_erro
       FROM fabric_outbox WHERE status = 'rejeitado' ORDER BY id DESC LIMIT $1`,
    [limite],
  );
  return res.rows as MensagemOutbox[];
}

export async function buscarPorTransacoes(ids: string[]): Promise<Map<string, MensagemOutbox>> {
  if (ids.length === 0) return new Map();
  const res = await pool.query(
    `SELECT id, tipo, referencia, carga, status, tentativas, fabric_tx_id, ultimo_erro
       FROM fabric_outbox WHERE tipo = 'evento' AND referencia = ANY($1::varchar[])`,
    [ids],
  );
  return new Map((res.rows as MensagemOutbox[]).map((m) => [m.referencia, m]));
}
