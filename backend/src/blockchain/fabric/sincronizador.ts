import { pool } from '../../banco/conexao';
import registrador from '../../utils/registrador';
import type { Transacao } from '../cadeia';
import { lerConfigFabric, mensagemErroFabric, submeter } from './cliente';
import * as outbox from './outbox';

/**
 * Entrega as mensagens do outbox ao Hyperledger Fabric.
 *
 * Ordem: as mensagens são enviadas estritamente em ordem de criação. Se uma falha por motivo
 * transitório (rede fora, peer reiniciando), o lote PARA — enviar o evento seguinte do mesmo
 * documento antes do anterior faria o chaincode recusá-lo como TRANSICAO_INVALIDA.
 *
 * Classificação das respostas do chaincode:
 *   EVENTO_DUPLICADO / CHECKPOINT_REGRESSIVO → já está no ledger: confirmado (idempotência)
 *   TRANSICAO_INVALIDA, EVENTO_*, ACESSO_NEGADO, CHECKPOINT_INVALIDO → rejeitado (permanente)
 *   qualquer outro erro → transitório: nova tentativa com backoff exponencial
 */

const JA_REGISTRADO = /EVENTO_DUPLICADO|CHECKPOINT_REGRESSIVO/;
const PERMANENTE = /TRANSICAO_INVALIDA|EVENTO_INVALIDO|EVENTO_ADULTERADO|ACESSO_NEGADO|CHECKPOINT_INVALIDO/;
const TAMANHO_LOTE = 20;

export type Classificacao = 'confirmado' | 'rejeitado' | 'transitorio';

export function classificarErro(mensagem: string): Classificacao {
  if (JA_REGISTRADO.test(mensagem)) return 'confirmado';
  if (PERMANENTE.test(mensagem)) return 'rejeitado';
  return 'transitorio';
}

async function entregar(m: outbox.MensagemOutbox): Promise<{ txId: string }> {
  if (m.tipo === 'checkpoint') {
    const c = m.carga as { altura: number; hashBloco: string };
    return submeter('RegistrarCheckpoint', String(c.altura), c.hashBloco);
  }
  return submeter('RegistrarEvento', JSON.stringify(m.carga as Transacao));
}

let executando = false;

/** Processa um lote. Retorna quantas mensagens saíram do estado pendente. */
export async function processarOutbox(): Promise<number> {
  if (executando) return 0;
  executando = true;

  // Advisory lock de sessão: apenas uma instância da API sincroniza por vez
  const cliente = await pool.connect();
  let processadas = 0;
  try {
    const lock = await cliente.query("SELECT pg_try_advisory_lock(hashtext('valida_fabric_outbox')) AS ok");
    if (!lock.rows[0].ok) return 0;

    try {
      if (!(await outbox.proximaTentativaLiberada())) return 0;

      for (const m of await outbox.buscarProntas(TAMANHO_LOTE)) {
        try {
          const { txId } = await entregar(m);
          await outbox.marcarConfirmada(m.id, txId);
          processadas += 1;
        } catch (err) {
          const msg = mensagemErroFabric(err);
          const classe = classificarErro(msg);
          if (classe === 'confirmado') {
            await outbox.marcarConfirmada(m.id, null, msg);
            processadas += 1;
          } else if (classe === 'rejeitado') {
            await outbox.marcarRejeitada(m.id, msg);
            processadas += 1;
            registrador.warn(`[fabric] ${m.tipo} ${m.referencia.slice(0, 12)}… REJEITADO pelo chaincode: ${msg}`);
          } else {
            await outbox.agendarNovaTentativa(m.id, msg);
            registrador.warn(`[fabric] falha transitória (${m.tentativas + 1}ª tentativa): ${msg}`);
            break; // preserva a ordem
          }
        }
      }
    } finally {
      await cliente.query("SELECT pg_advisory_unlock(hashtext('valida_fabric_outbox'))");
    }
  } finally {
    cliente.release();
    executando = false;
  }

  if (processadas > 0) registrador.info(`[fabric] ${processadas} mensagem(ns) sincronizada(s) com o ledger`);
  return processadas;
}

let temporizador: NodeJS.Timeout | null = null;

export function iniciarSincronizador(): void {
  const cfg = lerConfigFabric();
  if (!cfg.habilitado || temporizador) return;
  temporizador = setInterval(() => {
    processarOutbox().catch((err: unknown) =>
      registrador.error(`[fabric] erro no sincronizador: ${err instanceof Error ? err.message : String(err)}`),
    );
  }, cfg.intervaloSincronizacaoMs);
  temporizador.unref();
  registrador.info(`[fabric] sincronizador iniciado (a cada ${cfg.intervaloSincronizacaoMs} ms)`);
}

/** Dispara uma rodada imediata (chamado após minerar um bloco). */
export function acionarSincronizador(): void {
  if (!lerConfigFabric().habilitado) return;
  setImmediate(() => {
    processarOutbox().catch(() => undefined);
  });
}
