import { ValidaDocumentosContrato } from '../src/contrato';
import { calcularIdEvento, type EventoEntrada, type TipoEvento } from '../src/regras';

/**
 * Stub em memória que imita o ChaincodeStub do peer (state, chaves compostas, histórico,
 * consulta rica simples). Permite testar o contrato sem subir a rede Fabric.
 */
function criarContexto(msp = 'Org1MSP') {
  const estado = new Map<string, Buffer>();
  const historico = new Map<string, { txId: string; value: Buffer }[]>();
  let tx = 0;
  const eventos: { nome: string; payload: string }[] = [];

  const iteravel = (itens: { key: string; value: Buffer }[]) => ({
    async *[Symbol.asyncIterator]() {
      for (const i of itens) yield i;
    },
  });

  const stub = {
    getTxID: () => `tx-${tx}`,
    getTxTimestamp: () => ({ seconds: 1767225600 + tx, nanos: 0 }),
    createCompositeKey: (tipo: string, atributos: string[]) => `\u0000${tipo}\u0000${atributos.join('\u0000')}\u0000`,
    getState: async (k: string) => estado.get(k) ?? Buffer.alloc(0),
    putState: async (k: string, v: Buffer) => {
      estado.set(k, v);
      historico.set(k, [...(historico.get(k) ?? []), { txId: `tx-${tx}`, value: v }]);
    },
    setEvent: (nome: string, payload: Buffer) => eventos.push({ nome, payload: payload.toString() }),
    getStateByPartialCompositeKey: (tipo: string, atributos: string[]) => {
      const prefixo = `\u0000${tipo}\u0000${atributos.map((a) => `${a}\u0000`).join('')}`;
      return iteravel(
        [...estado.entries()]
          .filter(([k]) => k.startsWith(prefixo))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => ({ key, value })),
      );
    },
    getQueryResult: (query: string) => {
      const { selector } = JSON.parse(query) as { selector: Record<string, unknown> };
      return iteravel(
        [...estado.entries()]
          .filter(([, v]) => {
            try {
              const obj = JSON.parse(v.toString()) as Record<string, unknown>;
              return Object.entries(selector).every(([c, val]) => obj[c] === val);
            } catch {
              return false;
            }
          })
          .map(([key, value]) => ({ key, value })),
      );
    },
    getHistoryForKey: async (k: string) => {
      const itens = historico.get(k) ?? [];
      let i = 0;
      return {
        next: async () =>
          i < itens.length
            ? { done: false, value: { txId: itens[i].txId, isDelete: false, value: itens[i++].value } }
            : { done: true, value: undefined as never },
        close: async () => undefined,
      };
    },
  };

  const ctx = { stub, clientIdentity: { getMSPID: () => msp } };
  return { ctx: ctx as never, estado, eventos, avancar: () => (tx += 1) };
}

let contador = 0;
function evento(tipo: TipoEvento, documentoId = 'doc-1', extra: Partial<EventoEntrada> = {}): EventoEntrada {
  const base = {
    tipo,
    documentoId,
    hashArquivo: tipo === 'DOCUMENTO_SUBMETIDO' ? 'a'.repeat(64) : null,
    dados: {},
    timestamp: '2026-01-01T00:00:00.000Z',
    sal: String(contador++).padStart(16, '0'),
    ...extra,
  };
  return { id: calcularIdEvento(base), ...base };
}

describe('regras compartilhadas com o backend', () => {
  it('calcula o mesmo id que backend/src/blockchain/cadeia.ts (vetor de teste)', () => {
    expect(
      calcularIdEvento({
        tipo: 'DOCUMENTO_SUBMETIDO',
        documentoId: 'doc-vetor',
        hashArquivo: 'a'.repeat(64),
        dados: { tipoDocumento: 'outro', curso: 'b'.repeat(64) },
        timestamp: '2026-01-01T00:00:00.000Z',
        sal: '0011223344556677',
      }),
    ).toBe('bd10495930100b82164a5c2e3a2adfd7513820867e08897c2e35b5bbd35a045f');
  });
});

describe('RegistrarEvento', () => {
  const contrato = new ValidaDocumentosContrato();

  async function registrar(c: ReturnType<typeof criarContexto>, e: EventoEntrada) {
    c.avancar();
    return JSON.parse(await contrato.RegistrarEvento(c.ctx, JSON.stringify(e))) as { status: string };
  }

  it('percorre o ciclo feliz e emite evento de chaincode', async () => {
    const c = criarContexto();
    expect((await registrar(c, evento('DOCUMENTO_SUBMETIDO'))).status).toBe('PENDENTE');
    expect((await registrar(c, evento('DOCUMENTO_APROVADO'))).status).toBe('APROVADO');
    expect((await registrar(c, evento('CERTIFICADO_EMITIDO'))).status).toBe('CERTIFICADO');
    expect(c.eventos).toHaveLength(3);

    const consulta = JSON.parse(await contrato.ConsultarDocumento(c.ctx, 'doc-1'));
    expect(consulta.eventos.map((e: { tipo: string }) => e.tipo)).toEqual([
      'DOCUMENTO_SUBMETIDO',
      'DOCUMENTO_APROVADO',
      'CERTIFICADO_EMITIDO',
    ]);
  });

  it('recusa transição inválida (certificado sem aprovação)', async () => {
    const c = criarContexto();
    await registrar(c, evento('DOCUMENTO_SUBMETIDO'));
    await expect(registrar(c, evento('CERTIFICADO_EMITIDO'))).rejects.toThrow('TRANSICAO_INVALIDA');
  });

  it('recusa aprovação duplicada', async () => {
    const c = criarContexto();
    await registrar(c, evento('DOCUMENTO_SUBMETIDO'));
    await registrar(c, evento('DOCUMENTO_APROVADO'));
    await expect(registrar(c, evento('DOCUMENTO_APROVADO'))).rejects.toThrow('TRANSICAO_INVALIDA');
  });

  it('é idempotente: o mesmo evento não é gravado duas vezes', async () => {
    const c = criarContexto();
    const e = evento('DOCUMENTO_SUBMETIDO');
    await registrar(c, e);
    await expect(registrar(c, e)).rejects.toThrow('EVENTO_DUPLICADO');
  });

  it('detecta evento adulterado no caminho backend → Fabric', async () => {
    const c = criarContexto();
    const e = { ...evento('DOCUMENTO_SUBMETIDO'), hashArquivo: 'f'.repeat(64) };
    await expect(registrar(c, e)).rejects.toThrow('EVENTO_ADULTERADO');
  });

  it('exige hashArquivo na submissão', async () => {
    const c = criarContexto();
    await expect(registrar(c, evento('DOCUMENTO_SUBMETIDO', 'doc-1', { hashArquivo: null }))).rejects.toThrow(
      'submissão exige hashArquivo',
    );
  });

  it('nega escrita a organizações não autorizadas', async () => {
    const c = criarContexto('Org9MSP');
    await expect(registrar(c, evento('DOCUMENTO_SUBMETIDO'))).rejects.toThrow('ACESSO_NEGADO');
  });

  it('consulta por hash de arquivo, por status (CouchDB) e histórico da chave', async () => {
    const c = criarContexto();
    await registrar(c, evento('DOCUMENTO_SUBMETIDO', 'doc-A'));
    await registrar(c, evento('DOCUMENTO_SUBMETIDO', 'doc-B', { hashArquivo: 'b'.repeat(64) }));
    await registrar(c, evento('DOCUMENTO_REPROVADO', 'doc-B'));

    const porArquivo = JSON.parse(await contrato.ConsultarPorArquivo(c.ctx, 'a'.repeat(64)));
    expect(porArquivo.map((e: { documentoId: string }) => e.documentoId)).toEqual(['doc-A']);

    const pendentes = JSON.parse(await contrato.ConsultarPorStatus(c.ctx, 'PENDENTE'));
    expect(pendentes.map((d: { documentoId: string }) => d.documentoId)).toEqual(['doc-A']);

    const historico = JSON.parse(await contrato.HistoricoDocumento(c.ctx, 'doc-B'));
    expect(historico.map((h: { valor: { status: string } }) => h.valor.status)).toEqual(['PENDENTE', 'REPROVADO']);
  });
});

describe('RegistrarCheckpoint', () => {
  const contrato = new ValidaDocumentosContrato();

  it('ancora o hash da cadeia própria e recusa checkpoints regressivos', async () => {
    const c = criarContexto();
    await contrato.RegistrarCheckpoint(c.ctx, '10', 'c'.repeat(64));
    c.avancar();
    await expect(contrato.RegistrarCheckpoint(c.ctx, '10', 'd'.repeat(64))).rejects.toThrow('CHECKPOINT_REGRESSIVO');
    await contrato.RegistrarCheckpoint(c.ctx, '20', 'd'.repeat(64));

    expect(JSON.parse(await contrato.UltimoCheckpoint(c.ctx)).altura).toBe(20);
    expect(JSON.parse(await contrato.ConsultarCheckpoint(c.ctx, '10')).hashBloco).toBe('c'.repeat(64));
  });
});
