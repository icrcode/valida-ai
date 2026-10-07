jest.mock('../../../src/banco/conexao', () => ({
  pool: {
    connect: jest.fn(async () => ({
      query: jest.fn(async () => ({ rows: [{ ok: true }] })),
      release: jest.fn(),
    })),
  },
}));
jest.mock('../../../src/blockchain/fabric/cliente', () => ({
  submeter: jest.fn(),
  lerConfigFabric: jest.fn(() => ({ habilitado: true, intervaloSincronizacaoMs: 1000 })),
  mensagemErroFabric: (err: unknown) => (err instanceof Error ? err.message : String(err)),
}));
jest.mock('../../../src/blockchain/fabric/outbox');

import { submeter } from '../../../src/blockchain/fabric/cliente';
import * as outbox from '../../../src/blockchain/fabric/outbox';
import { classificarErro, processarOutbox } from '../../../src/blockchain/fabric/sincronizador';

const mockSubmeter = submeter as jest.Mock;
const mockOutbox = outbox as jest.Mocked<typeof outbox>;

function mensagem(id: string, tipo: outbox.TipoMensagem = 'evento'): outbox.MensagemOutbox {
  return {
    id,
    tipo,
    referencia: `ref-${id}`,
    carga: tipo === 'evento' ? ({ id: `tx-${id}` } as never) : { altura: 10, hashBloco: 'a'.repeat(64) },
    status: 'pendente',
    tentativas: 0,
    fabric_tx_id: null,
    ultimo_erro: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOutbox.proximaTentativaLiberada.mockResolvedValue(true);
});

describe('classificarErro', () => {
  it.each([
    ['EVENTO_DUPLICADO: abc', 'confirmado'],
    ['CHECKPOINT_REGRESSIVO: altura 3', 'confirmado'],
    ['TRANSICAO_INVALIDA: CERTIFICADO_EMITIDO não é permitido', 'rejeitado'],
    ['EVENTO_ADULTERADO: id não confere', 'rejeitado'],
    ['ACESSO_NEGADO: Org9MSP', 'rejeitado'],
    ['14 UNAVAILABLE: No connection established', 'transitorio'],
  ])('%s → %s', (msg, esperado) => {
    expect(classificarErro(msg)).toBe(esperado);
  });
});

describe('processarOutbox', () => {
  it('confirma mensagens entregues e envia checkpoints com a função correta', async () => {
    mockOutbox.buscarProntas.mockResolvedValueOnce([mensagem('1'), mensagem('2', 'checkpoint')]);
    mockSubmeter.mockResolvedValue({ txId: 'fabric-tx', resultado: '{}' });

    expect(await processarOutbox()).toBe(2);
    expect(mockSubmeter).toHaveBeenNthCalledWith(1, 'RegistrarEvento', JSON.stringify({ id: 'tx-1' }));
    expect(mockSubmeter).toHaveBeenNthCalledWith(2, 'RegistrarCheckpoint', '10', 'a'.repeat(64));
    expect(mockOutbox.marcarConfirmada).toHaveBeenCalledTimes(2);
  });

  it('trata EVENTO_DUPLICADO como confirmado (idempotência)', async () => {
    mockOutbox.buscarProntas.mockResolvedValueOnce([mensagem('1')]);
    mockSubmeter.mockRejectedValueOnce(new Error('EVENTO_DUPLICADO: tx-1'));
    await processarOutbox();
    expect(mockOutbox.marcarConfirmada).toHaveBeenCalledWith('1', null, 'EVENTO_DUPLICADO: tx-1');
  });

  it('marca rejeição permanente e continua o lote', async () => {
    mockOutbox.buscarProntas.mockResolvedValueOnce([mensagem('1'), mensagem('2')]);
    mockSubmeter
      .mockRejectedValueOnce(new Error('TRANSICAO_INVALIDA: aprovação duplicada'))
      .mockResolvedValueOnce({ txId: 'ok', resultado: '{}' });
    await processarOutbox();
    expect(mockOutbox.marcarRejeitada).toHaveBeenCalledWith('1', 'TRANSICAO_INVALIDA: aprovação duplicada');
    expect(mockOutbox.marcarConfirmada).toHaveBeenCalledWith('2', 'ok');
  });

  it('para o lote na primeira falha transitória para preservar a ordem dos eventos', async () => {
    mockOutbox.buscarProntas.mockResolvedValueOnce([mensagem('1'), mensagem('2'), mensagem('3')]);
    mockSubmeter.mockResolvedValueOnce({ txId: 'ok', resultado: '{}' }).mockRejectedValueOnce(new Error('UNAVAILABLE'));
    expect(await processarOutbox()).toBe(1);
    expect(mockOutbox.agendarNovaTentativa).toHaveBeenCalledWith('2', 'UNAVAILABLE');
    expect(mockSubmeter).toHaveBeenCalledTimes(2);
  });

  it('respeita o backoff da mensagem mais antiga', async () => {
    mockOutbox.proximaTentativaLiberada.mockResolvedValueOnce(false);
    expect(await processarOutbox()).toBe(0);
    expect(mockOutbox.buscarProntas).not.toHaveBeenCalled();
  });
});
