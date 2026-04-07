jest.mock('../../../src/utils/registrador', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import registrador from '../../../src/utils/registrador';
import { notificar } from '../../../src/servicos/notificacao';

const mockRegistrador = registrador as jest.Mocked<typeof registrador>;

const DADOS_BASE = {
  destinatarioId: 'usr-1',
  destinatarioEmail: 'joao@uni.edu',
  destinatarioNome: 'João',
  assunto: 'Documento aprovado',
  mensagem: 'Seu documento foi aprovado.',
};

beforeEach(() => jest.clearAllMocks());

describe('notificar', () => {
  it('resolve sem lançar exceção', async () => {
    await expect(notificar(DADOS_BASE)).resolves.toBeUndefined();
  });

  it('registra log com nome, email e assunto do destinatário', async () => {
    await notificar(DADOS_BASE);

    expect(mockRegistrador.info).toHaveBeenCalledTimes(1);
    expect(mockRegistrador.info).toHaveBeenCalledWith(
      expect.stringContaining('joao@uni.edu'),
    );
    expect(mockRegistrador.info).toHaveBeenCalledWith(
      expect.stringContaining('Documento aprovado'),
    );
  });

  it('inclui o nome do destinatário no log', async () => {
    await notificar({ ...DADOS_BASE, destinatarioNome: 'Maria' });

    expect(mockRegistrador.info).toHaveBeenCalledWith(
      expect.stringContaining('Maria'),
    );
  });

  it('aceita qualquer assunto sem erros', async () => {
    await expect(
      notificar({ ...DADOS_BASE, assunto: 'Revisão solicitada para seu documento' }),
    ).resolves.toBeUndefined();
  });
});
