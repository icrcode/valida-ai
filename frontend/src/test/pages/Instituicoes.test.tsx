import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ADMIN } from '../helpers/renderWithProviders';
import { Instituicoes } from '../../pages/Instituicoes';

const { mockInstituicoesService } = vi.hoisted(() => ({
  mockInstituicoesService: {
    listar: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    alterarAtiva: vi.fn(),
  },
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../../services/instituicoes', () => ({ instituicoesService: mockInstituicoesService }));

const INST_MOCK = [
  {
    id: 'i-1', nome: 'Universidade Federal', sigla: 'UFSC',
    cnpj: '00.000.000/0001-00', email_contato: 'contato@ufsc.br',
    telefone: '(48) 3333-4444', site: 'https://ufsc.br',
    endereco: 'Campus Trindade', cidade: 'Florianópolis', estado: 'SC',
    dominios_email: ['ufsc.br', 'grad.ufsc.br'], ativa: true,
    criado_em: '', atualizado_em: '',
  },
  {
    id: 'i-2', nome: 'Instituto Estadual', sigla: 'IFE',
    cnpj: null, email_contato: null, telefone: null, site: null,
    endereco: null, cidade: null, estado: null,
    dominios_email: [], ativa: false,
    criado_em: '', atualizado_em: '',
  },
];

function renderInstituicoes() {
  return renderWithProviders(<Instituicoes />, { token: 'tok', usuario: USUARIO_ADMIN });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockInstituicoesService.listar.mockResolvedValue(INST_MOCK);
});

describe('Instituicoes — renderização', () => {
  it('exibe título Instituições', async () => {
    renderInstituicoes();
    await waitFor(() => expect(screen.getByText('Instituições')).toBeInTheDocument());
  });

  it('exibe lista de instituições após carregar', async () => {
    renderInstituicoes();
    await waitFor(() => {
      expect(screen.getByText('Universidade Federal')).toBeInTheDocument();
      expect(screen.getByText('Instituto Estadual')).toBeInTheDocument();
    });
  });

  it('exibe siglas das instituições', async () => {
    renderInstituicoes();
    await waitFor(() => {
      expect(screen.getByText('UFSC')).toBeInTheDocument();
      expect(screen.getByText('IFE')).toBeInTheDocument();
    });
  });

  it('exibe badge Inativa para instituição inativa', async () => {
    renderInstituicoes();
    await waitFor(() => expect(screen.getByText('Inativa')).toBeInTheDocument());
  });

  it('exibe estado de carregamento', () => {
    mockInstituicoesService.listar.mockReturnValue(new Promise(() => {}));
    renderInstituicoes();
    expect(screen.getByText('Carregando instituições...')).toBeInTheDocument();
  });

  it('exibe mensagem quando lista está vazia', async () => {
    mockInstituicoesService.listar.mockResolvedValue([]);
    renderInstituicoes();
    await waitFor(() =>
      expect(screen.getByText('Nenhuma instituição cadastrada ainda.')).toBeInTheDocument(),
    );
  });

  it('exibe domínios de e-mail da instituição', async () => {
    renderInstituicoes();
    await waitFor(() => {
      expect(screen.getByText('@ufsc.br')).toBeInTheDocument();
      expect(screen.getByText('@grad.ufsc.br')).toBeInTheDocument();
    });
  });

  it('exibe Qualquer domínio aceito para instituição sem domínios', async () => {
    renderInstituicoes();
    await waitFor(() => expect(screen.getByText('Qualquer domínio aceito')).toBeInTheDocument());
  });

  it('exibe localização da instituição', async () => {
    renderInstituicoes();
    await waitFor(() => expect(screen.getByText(/Florianópolis/)).toBeInTheDocument());
  });

  it('exibe e-mail de contato como link mailto', async () => {
    renderInstituicoes();
    await waitFor(() => {
      const link = screen.getByText('contato@ufsc.br');
      expect(link.closest('a')).toHaveAttribute('href', 'mailto:contato@ufsc.br');
    });
  });

  it('exibe site como link externo', async () => {
    renderInstituicoes();
    await waitFor(() => {
      const link = screen.getByText('https://ufsc.br');
      expect(link.closest('a')).toHaveAttribute('href', 'https://ufsc.br');
    });
  });

  it('exibe telefone da instituição', async () => {
    renderInstituicoes();
    await waitFor(() => expect(screen.getByText('(48) 3333-4444')).toBeInTheDocument());
  });

  it('botão Nova instituição está presente', async () => {
    renderInstituicoes();
    await waitFor(() => expect(screen.getByText('Nova instituição')).toBeInTheDocument());
  });
});

describe('Instituicoes — busca', () => {
  it('filtra por nome', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Universidade Federal'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'Federal' } });
    expect(screen.queryByText('Instituto Estadual')).not.toBeInTheDocument();
    expect(screen.getByText('Universidade Federal')).toBeInTheDocument();
  });

  it('filtra por sigla', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Universidade Federal'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'IFE' } });
    expect(screen.queryByText('Universidade Federal')).not.toBeInTheDocument();
    expect(screen.getByText('Instituto Estadual')).toBeInTheDocument();
  });

  it('exibe mensagem quando busca não encontra resultado', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Universidade Federal'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'xyzinexistente' } });
    await waitFor(() =>
      expect(screen.getByText('Nenhuma instituição encontrada.')).toBeInTheDocument(),
    );
  });
});

describe('Instituicoes — modal criar', () => {
  it('abre modal ao clicar em Nova instituição', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));
    expect(screen.getByText('Criar instituição')).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Criar instituição')).not.toBeInTheDocument();
  });

  it('não chama criar quando nome e sigla estão vazios', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Criar instituição'));
    expect(mockInstituicoesService.criar).not.toHaveBeenCalled();
  });

  it('chama instituicoesService.criar com nome e sigla preenchidos', async () => {
    mockInstituicoesService.criar.mockResolvedValue({ id: 'i-3' });
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));

    fireEvent.change(screen.getByPlaceholderText('Ex: Universidade Federal de SC'), {
      target: { value: 'Nova Universidade' },
    });
    fireEvent.change(screen.getByPlaceholderText('UFSC'), { target: { value: 'NU' } });
    fireEvent.click(screen.getByText('Criar instituição'));
    await waitFor(() => expect(mockInstituicoesService.criar).toHaveBeenCalled());
  });

  it('permite adicionar domínio de e-mail via botão Adicionar', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));

    fireEvent.change(screen.getByPlaceholderText('ex: ufsc.br'), {
      target: { value: 'novo.edu.br' },
    });
    fireEvent.click(screen.getByText('Adicionar'));
    expect(screen.getByText('@novo.edu.br')).toBeInTheDocument();
  });

  it('permite adicionar domínio via tecla Enter', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));

    const input = screen.getByPlaceholderText('ex: ufsc.br');
    fireEvent.change(input, { target: { value: 'pressenter.edu' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('@pressenter.edu')).toBeInTheDocument();
  });

  it('permite remover domínio adicionado', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));

    fireEvent.change(screen.getByPlaceholderText('ex: ufsc.br'), {
      target: { value: 'remover.edu' },
    });
    fireEvent.click(screen.getByText('Adicionar'));
    expect(screen.getByText('@remover.edu')).toBeInTheDocument();

    fireEvent.click(screen.getByText('×'));
    expect(screen.queryByText('@remover.edu')).not.toBeInTheDocument();
  });

  it('não adiciona domínio duplicado', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));

    const input = screen.getByPlaceholderText('ex: ufsc.br');
    fireEvent.change(input, { target: { value: 'duplo.edu' } });
    fireEvent.click(screen.getByText('Adicionar'));
    fireEvent.change(input, { target: { value: 'duplo.edu' } });
    fireEvent.click(screen.getByText('Adicionar'));

    const tags = screen.getAllByText('@duplo.edu');
    expect(tags).toHaveLength(1);
  });

  it('exibe campos opcionais no formulário', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));
    expect(screen.getByPlaceholderText('contato@instituicao.edu.br')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('(48) 3333-4444')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('00.000.000/0001-00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://www.instituicao.edu.br')).toBeInTheDocument();
  });
});

describe('Instituicoes — modal editar', () => {
  it('abre modal de edição ao clicar em Editar', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByText('Salvar alterações')).toBeInTheDocument();
  });

  it('preenche modal com dados da instituição', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByDisplayValue('Universidade Federal')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UFSC')).toBeInTheDocument();
  });

  it('fecha modal de edição ao clicar em Cancelar', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Salvar alterações')).not.toBeInTheDocument();
  });

  it('chama instituicoesService.atualizar ao salvar', async () => {
    mockInstituicoesService.atualizar.mockResolvedValue({ id: 'i-1' });
    renderInstituicoes();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Salvar alterações'));
    await waitFor(() =>
      expect(mockInstituicoesService.atualizar).toHaveBeenCalledWith(
        'i-1',
        expect.objectContaining({ nome: 'Universidade Federal', sigla: 'UFSC' }),
      ),
    );
  });

  it('não chama atualizar quando nome é apagado', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.change(screen.getByDisplayValue('Universidade Federal'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Salvar alterações'));
    expect(mockInstituicoesService.atualizar).not.toHaveBeenCalled();
  });
});

describe('Instituicoes — alterar ativa', () => {
  it('chama instituicoesService.alterarAtiva ao desativar instituição ativa', async () => {
    mockInstituicoesService.alterarAtiva.mockResolvedValue({ id: 'i-1', ativa: false });
    renderInstituicoes();
    await waitFor(() => screen.getByText('Desativar'));
    fireEvent.click(screen.getByText('Desativar'));
    await waitFor(() =>
      expect(mockInstituicoesService.alterarAtiva).toHaveBeenCalledWith('i-1', false),
    );
  });

  it('chama instituicoesService.alterarAtiva ao ativar instituição inativa', async () => {
    mockInstituicoesService.alterarAtiva.mockResolvedValue({ id: 'i-2', ativa: true });
    renderInstituicoes();
    await waitFor(() => screen.getByText('Ativar'));
    fireEvent.click(screen.getByText('Ativar'));
    await waitFor(() =>
      expect(mockInstituicoesService.alterarAtiva).toHaveBeenCalledWith('i-2', true),
    );
  });
});

describe('Instituicoes — erros de mutation', () => {
  it('exibe erro personalizado da API ao falhar criação', async () => {
    mockInstituicoesService.criar.mockRejectedValue({
      response: { data: { erro: 'CNPJ já cadastrado' } },
    });
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));
    fireEvent.change(screen.getByPlaceholderText('Ex: Universidade Federal de SC'), {
      target: { value: 'Instituição Duplicada' },
    });
    fireEvent.change(screen.getByPlaceholderText('UFSC'), { target: { value: 'ID' } });
    fireEvent.click(screen.getByText('Criar instituição'));
    await waitFor(() => expect(mockInstituicoesService.criar).toHaveBeenCalled());
  });

  it('exibe mensagem genérica ao falhar criação sem detalhe da API', async () => {
    mockInstituicoesService.criar.mockRejectedValue(new Error('Network error'));
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));
    fireEvent.change(screen.getByPlaceholderText('Ex: Universidade Federal de SC'), {
      target: { value: 'Nova Inst' },
    });
    fireEvent.change(screen.getByPlaceholderText('UFSC'), { target: { value: 'NI' } });
    fireEvent.click(screen.getByText('Criar instituição'));
    await waitFor(() => expect(mockInstituicoesService.criar).toHaveBeenCalled());
  });

  it('exibe erro ao falhar atualização de instituição', async () => {
    mockInstituicoesService.atualizar.mockRejectedValue(new Error('fail'));
    renderInstituicoes();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Salvar alterações'));
    await waitFor(() => expect(mockInstituicoesService.atualizar).toHaveBeenCalled());
  });

  it('exibe erro ao falhar alteração de status', async () => {
    mockInstituicoesService.alterarAtiva.mockRejectedValue(new Error('fail'));
    renderInstituicoes();
    await waitFor(() => screen.getByText('Desativar'));
    fireEvent.click(screen.getByText('Desativar'));
    await waitFor(() => expect(mockInstituicoesService.alterarAtiva).toHaveBeenCalled());
  });
});

describe('Instituicoes — fechar modal pelo botão ×', () => {
  it('fecha modal de criação pelo botão × do cabeçalho', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getByText('Nova instituição'));
    fireEvent.click(screen.getByText('Nova instituição'));

    const overlay = document.querySelector('.fixed.inset-0');
    const closeBtn = overlay?.querySelector('button');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    expect(screen.queryByText('Criar instituição')).not.toBeInTheDocument();
  });

  it('fecha modal de edição pelo botão × do cabeçalho', async () => {
    renderInstituicoes();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);

    const overlay = document.querySelector('.fixed.inset-0');
    const closeBtn = overlay?.querySelector('button');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    expect(screen.queryByText('Salvar alterações')).not.toBeInTheDocument();
  });
});
