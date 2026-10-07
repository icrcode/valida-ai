import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import {
  calcularIdEvento,
  HEX64,
  TIPOS_EVENTO,
  TRANSICOES,
  type EstadoDocumento,
  type EventoEntrada,
} from './regras';

/**
 * Chaincode "valida-documentos".
 *
 * Diferente da cadeia própria (que só DETECTA adulterações depois), aqui as regras são
 * aplicadas no ENDOSSO: cada peer executa RegistrarEvento e só assina a proposta se:
 *   1. o id do evento confere com o conteúdo (integridade de ponta a ponta com o backend);
 *   2. o evento ainda não existe (idempotência — o outbox do backend pode reenviar);
 *   3. a transição respeita a máquina de estados do documento (prevenção de fraude);
 *   4. a organização chamadora tem permissão de escrita.
 *
 * O ledger (blockchain + world state em CouchDB) fica persistido nos volumes dos peers.
 */

const ORGS_ESCRITA = ['Org1MSP', 'Org2MSP'];

interface RegistroDocumento {
  docType: 'documento';
  documentoId: string;
  status: EstadoDocumento;
  hashArquivo: string | null;
  eventos: string[];
  atualizadoEm: string;
}

interface RegistroEvento extends EventoEntrada {
  docType: 'evento';
  txIdFabric: string;
  registradoPor: string;
  registradoEm: string;
}

interface Checkpoint {
  docType: 'checkpoint';
  altura: number;
  hashBloco: string;
  txIdFabric: string;
  registradoPor: string;
  registradoEm: string;
}

function chaveDocumento(ctx: Context, documentoId: string): string {
  return ctx.stub.createCompositeKey('documento', [documentoId]);
}

function chaveEvento(ctx: Context, id: string): string {
  return ctx.stub.createCompositeKey('evento', [id]);
}

function dataDaTransacao(ctx: Context): string {
  // Nunca usar Date.now(): cada peer teria um valor diferente e o endosso divergiria
  const ts = ctx.stub.getTxTimestamp();
  const segundos = typeof ts.seconds === 'number' ? ts.seconds : Number(ts.seconds.toString());
  return new Date(segundos * 1000 + Math.floor(ts.nanos / 1e6)).toISOString();
}

async function lerJson<T>(ctx: Context, chave: string): Promise<T | null> {
  const bytes = await ctx.stub.getState(chave);
  return bytes && bytes.length > 0 ? (JSON.parse(Buffer.from(bytes).toString('utf8')) as T) : null;
}

async function gravarJson(ctx: Context, chave: string, valor: unknown): Promise<void> {
  await ctx.stub.putState(chave, Buffer.from(JSON.stringify(valor)));
}

async function coletar(iterador: AsyncIterable<{ value: Uint8Array }>): Promise<unknown[]> {
  const itens: unknown[] = [];
  for await (const r of iterador) {
    itens.push(JSON.parse(Buffer.from(r.value).toString('utf8')));
  }
  return itens;
}

@Info({ title: 'ValidaDocumentos', description: 'Registro imutável do ciclo de vida de documentos acadêmicos' })
export class ValidaDocumentosContrato extends Contract {
  constructor() {
    super('ValidaDocumentos');
  }

  private exigirEscrita(ctx: Context): string {
    const msp = ctx.clientIdentity.getMSPID();
    if (!ORGS_ESCRITA.includes(msp)) {
      throw new Error(`ACESSO_NEGADO: a organização ${msp} não pode registrar eventos`);
    }
    return msp;
  }

  @Transaction()
  @Returns('string')
  async RegistrarEvento(ctx: Context, eventoJson: string): Promise<string> {
    const msp = this.exigirEscrita(ctx);

    let e: EventoEntrada;
    try {
      e = JSON.parse(eventoJson) as EventoEntrada;
    } catch {
      throw new Error('EVENTO_INVALIDO: JSON mal formado');
    }

    if (!TIPOS_EVENTO.includes(e.tipo)) throw new Error(`EVENTO_INVALIDO: tipo ${String(e.tipo)} desconhecido`);
    if (!e.documentoId) throw new Error('EVENTO_INVALIDO: documentoId obrigatório');
    if (e.hashArquivo !== null && !HEX64.test(e.hashArquivo)) {
      throw new Error('EVENTO_INVALIDO: hashArquivo deve ser SHA-256 hex');
    }
    if (e.tipo === 'DOCUMENTO_SUBMETIDO' && !e.hashArquivo) {
      throw new Error('EVENTO_INVALIDO: submissão exige hashArquivo');
    }

    const { id, ...semId } = e;
    if (calcularIdEvento(semId) !== id) {
      throw new Error('EVENTO_ADULTERADO: id não confere com o conteúdo do evento');
    }

    const kEvento = chaveEvento(ctx, id);
    if (await lerJson(ctx, kEvento)) {
      throw new Error(`EVENTO_DUPLICADO: ${id}`);
    }

    const kDoc = chaveDocumento(ctx, e.documentoId);
    const agora = dataDaTransacao(ctx);
    const doc: RegistroDocumento = (await lerJson<RegistroDocumento>(ctx, kDoc)) ?? {
      docType: 'documento',
      documentoId: e.documentoId,
      status: 'INICIO',
      hashArquivo: null,
      eventos: [],
      atualizadoEm: agora,
    };

    const proximo = TRANSICOES[doc.status][e.tipo];
    if (!proximo) {
      throw new Error(`TRANSICAO_INVALIDA: ${e.tipo} não é permitido no estado ${doc.status}`);
    }

    const evento: RegistroEvento = {
      ...e,
      docType: 'evento',
      txIdFabric: ctx.stub.getTxID(),
      registradoPor: msp,
      registradoEm: agora,
    };

    doc.status = proximo;
    doc.eventos.push(id);
    doc.atualizadoEm = agora;
    if (e.tipo === 'DOCUMENTO_SUBMETIDO') doc.hashArquivo = e.hashArquivo;

    await gravarJson(ctx, kEvento, evento);
    await gravarJson(ctx, kDoc, doc);
    if (e.hashArquivo) {
      // Índice secundário: arquivo → evento (consulta por prefixo de chave composta)
      const kArquivo = ctx.stub.createCompositeKey('arquivo', [e.hashArquivo, id]);
      await ctx.stub.putState(kArquivo, Buffer.from(id));
    }

    ctx.stub.setEvent('EventoRegistrado', Buffer.from(JSON.stringify({ id, tipo: e.tipo, documentoId: e.documentoId })));
    return JSON.stringify({ id, txIdFabric: evento.txIdFabric, status: doc.status });
  }

  /**
   * Ancoragem cruzada: grava no Fabric o hash do bloco mais recente da cadeia própria (PostgreSQL).
   * Depois disso, reescrever a cadeia própria exigiria também reescrever o ledger do Fabric,
   * que é replicado e endossado por várias organizações.
   */
  @Transaction()
  @Returns('string')
  async RegistrarCheckpoint(ctx: Context, altura: string, hashBloco: string): Promise<string> {
    const msp = this.exigirEscrita(ctx);
    const h = Number.parseInt(altura, 10);
    if (!Number.isInteger(h) || h < 0) throw new Error('CHECKPOINT_INVALIDO: altura');
    if (!HEX64.test(hashBloco)) throw new Error('CHECKPOINT_INVALIDO: hash');

    const ultimo = await lerJson<Checkpoint>(ctx, 'checkpoint-ultimo');
    if (ultimo && h <= ultimo.altura) {
      throw new Error(`CHECKPOINT_REGRESSIVO: altura ${h} ≤ último checkpoint ${ultimo.altura}`);
    }

    const cp: Checkpoint = {
      docType: 'checkpoint',
      altura: h,
      hashBloco,
      txIdFabric: ctx.stub.getTxID(),
      registradoPor: msp,
      registradoEm: dataDaTransacao(ctx),
    };
    await gravarJson(ctx, ctx.stub.createCompositeKey('checkpoint', [String(h).padStart(12, '0')]), cp);
    await gravarJson(ctx, 'checkpoint-ultimo', cp);
    return JSON.stringify(cp);
  }

  @Transaction(false)
  @Returns('string')
  async UltimoCheckpoint(ctx: Context): Promise<string> {
    return JSON.stringify(await lerJson<Checkpoint>(ctx, 'checkpoint-ultimo'));
  }

  @Transaction(false)
  @Returns('string')
  async ConsultarCheckpoint(ctx: Context, altura: string): Promise<string> {
    const k = ctx.stub.createCompositeKey('checkpoint', [String(Number.parseInt(altura, 10)).padStart(12, '0')]);
    return JSON.stringify(await lerJson<Checkpoint>(ctx, k));
  }

  @Transaction(false)
  @Returns('string')
  async ConsultarEvento(ctx: Context, id: string): Promise<string> {
    return JSON.stringify(await lerJson<RegistroEvento>(ctx, chaveEvento(ctx, id)));
  }

  @Transaction(false)
  @Returns('string')
  async ConsultarDocumento(ctx: Context, documentoId: string): Promise<string> {
    const doc = await lerJson<RegistroDocumento>(ctx, chaveDocumento(ctx, documentoId));
    if (!doc) return JSON.stringify(null);
    const eventos = [];
    for (const id of doc.eventos) eventos.push(await lerJson<RegistroEvento>(ctx, chaveEvento(ctx, id)));
    return JSON.stringify({ documento: doc, eventos });
  }

  /** Histórico de versões do estado do documento, direto do ledger (GetHistoryForKey). */
  @Transaction(false)
  @Returns('string')
  async HistoricoDocumento(ctx: Context, documentoId: string): Promise<string> {
    const iterador = await ctx.stub.getHistoryForKey(chaveDocumento(ctx, documentoId));
    const historico = [];
    try {
      for (let r = await iterador.next(); !r.done; r = await iterador.next()) {
        historico.push({
          txIdFabric: r.value.txId,
          removido: r.value.isDelete,
          valor: r.value.isDelete ? null : JSON.parse(Buffer.from(r.value.value).toString('utf8')),
        });
      }
    } finally {
      await iterador.close();
    }
    return JSON.stringify(historico);
  }

  @Transaction(false)
  @Returns('string')
  async ConsultarPorArquivo(ctx: Context, hashArquivo: string): Promise<string> {
    const ids: string[] = [];
    for await (const r of ctx.stub.getStateByPartialCompositeKey('arquivo', [hashArquivo])) {
      ids.push(Buffer.from(r.value).toString('utf8'));
    }
    const eventos = [];
    for (const id of ids) eventos.push(await lerJson<RegistroEvento>(ctx, chaveEvento(ctx, id)));
    return JSON.stringify(eventos);
  }

  /** Consulta rica (exige CouchDB como state database; usa o índice em META-INF). */
  @Transaction(false)
  @Returns('string')
  async ConsultarPorStatus(ctx: Context, status: string): Promise<string> {
    const query = { selector: { docType: 'documento', status }, use_index: ['_design/indexTipoStatusDoc', 'indexTipoStatus'] };
    return JSON.stringify(await coletar(ctx.stub.getQueryResult(JSON.stringify(query))));
  }
}
