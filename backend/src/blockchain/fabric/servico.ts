import * as repositorio from '../repositorio';
import { historicoDocumento } from '../servico';
import { verificarConformidade, type Rotulo, type ResultadoConformidade } from '../../pesquisa/conformidade';
import type { Estrategia } from '../../pesquisa/astar';
import { consultar, lerConfigFabric, mensagemErroFabric } from './cliente';
import * as outbox from './outbox';

/**
 * Consultas que cruzam as duas blockchains (cadeia própria em PostgreSQL × Hyperledger Fabric).
 */

interface EventoFabric {
  id: string;
  tipo: Rotulo;
  timestamp: string;
  txIdFabric: string;
  registradoEm: string;
}

interface DocumentoFabric {
  documento: { status: string; hashArquivo: string | null; eventos: string[] };
  eventos: EventoFabric[];
}

interface CheckpointFabric {
  altura: number;
  hashBloco: string;
  txIdFabric: string;
  registradoEm: string;
}

export async function statusFabric() {
  const cfg = lerConfigFabric();
  const base = { habilitado: cfg.habilitado, canal: cfg.canal, chaincode: cfg.chaincode };
  if (!cfg.habilitado) return { ...base, conectado: false };

  const fila = await outbox.contarPorStatus();
  try {
    const checkpoint = await consultar<CheckpointFabric | null>('UltimoCheckpoint');
    let checkpointConfere: boolean | null = null;
    if (checkpoint) {
      const bloco = await repositorio.buscarBloco(checkpoint.altura);
      checkpointConfere = bloco?.hash === checkpoint.hashBloco;
    }
    return { ...base, conectado: true, outbox: fila, ultimoCheckpoint: checkpoint, checkpointConfere };
  } catch (err) {
    return { ...base, conectado: false, outbox: fila, erro: mensagemErroFabric(err) };
  }
}

export async function documentoNoFabric(documentoId: string): Promise<DocumentoFabric | null> {
  return consultar<DocumentoFabric | null>('ConsultarDocumento', documentoId);
}

export interface RelatorioConformidade {
  documentoId: string;
  cadeiaPropria: { traco: Rotulo[]; conformidade: ResultadoConformidade };
  fabric?:
    | { disponivel: false; erro: string }
    | {
        disponivel: true;
        traco: Rotulo[];
        conformidade: ResultadoConformidade;
        status: string | null;
      };
  /** Divergências entre os dois ledgers, explicadas pelo estado do outbox. */
  reconciliacao?: {
    somenteCadeiaPropria: { transacao: string; tipo: Rotulo; outbox: string }[];
    somenteFabric: string[];
  };
}

export async function auditarDocumento(
  documentoId: string,
  opcoes: { modo?: 'completo' | 'prefixo'; estrategia?: Estrategia } = {},
): Promise<RelatorioConformidade> {
  const historico = await historicoDocumento(documentoId);
  const tracoPropria = historico.map((p) => p.transacao.tipo as Rotulo);
  const relatorio: RelatorioConformidade = {
    documentoId,
    cadeiaPropria: { traco: tracoPropria, conformidade: verificarConformidade(tracoPropria, opcoes) },
  };

  if (!lerConfigFabric().habilitado) return relatorio;

  try {
    const noFabric = await documentoNoFabric(documentoId);
    const eventosFabric = noFabric?.eventos ?? [];
    const tracoFabric = eventosFabric.map((e) => e.tipo);
    relatorio.fabric = {
      disponivel: true,
      traco: tracoFabric,
      conformidade: verificarConformidade(tracoFabric, opcoes),
      status: noFabric?.documento.status ?? null,
    };

    const idsFabric = new Set(eventosFabric.map((e) => e.id));
    const idsPropria = historico.map((p) => p.transacao.id);
    const mensagens = await outbox.buscarPorTransacoes(idsPropria);
    relatorio.reconciliacao = {
      somenteCadeiaPropria: historico
        .filter((p) => !idsFabric.has(p.transacao.id))
        .map((p) => {
          const m = mensagens.get(p.transacao.id);
          return {
            transacao: p.transacao.id,
            tipo: p.transacao.tipo as Rotulo,
            outbox: m ? `${m.status}${m.ultimo_erro ? `: ${m.ultimo_erro}` : ''}` : 'ausente do outbox',
          };
        }),
      somenteFabric: [...idsFabric].filter((id) => !idsPropria.includes(id)),
    };
  } catch (err) {
    relatorio.fabric = { disponivel: false, erro: mensagemErroFabric(err) };
  }

  return relatorio;
}
