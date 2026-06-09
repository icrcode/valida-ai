import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ADMIN } from '../helpers/renderWithProviders';
import { Cursos } from '../../pages/Cursos';

const { mockCursosService, mockInstituicoesService } = vi.hoisted(() => ({
  mockCursosService: {
    listarAdmin: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    alterarAtivo: vi.fn(),
  },
  mockInstituicoesService: {
    listar: vi.fn(),
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

vi.mock('../../services/cursos', () => ({ cursosService: mockCursosService }));
vi.mock('../../services/instituicoes', () => ({ instituicoesService: mockInstituicoesService }));

const INST_MOCK = [
  {
    id: 'i-1', nome: 'Universidade Teste', sigla: 'UT', ativa: true,
    dominios_email: [], cnpj: null, email_contato: null, telefone: null,
    site: null, endereco: null, cidade: null, estado: null,
    criado_em: '', atualizado_em: '',
  },
];

const CURSOS_MOCK = [
  {
    id: 'c-1', nome: 'Ciência da Computação', codigo: 'CC-001',
    carga_horaria_complementar: 200, turno: 'noturno', modalidade: 'presencial',
    instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste', instituicao_sigla: 'UT',
    ativo: true, total_estudantes: 5, criado_em: '', atualizado_em: '',
  },
  {
    id: 'c-2', nome: 'Engenharia de Software', codigo: 'ES-001',
    carga_horaria_complementar: 160, turno: null, modalidade: null,
    instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste', instituicao_sigla: 'UT',
    ativo: false, total_estudantes: 0, criado_em: '', atualizado_em: '',
  },
];

function renderCursos() {
  return renderWithProviders(<Cursos />, { token: 'tok', usuario: USUARIO_ADMIN });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockCursosService.listarAdmin.mockResolvedValue(CURSOS_MOCK);
  mockInstituicoesService.listar.mockResolvedValue(INST_MOCK);
});

describe('Cursos — renderização', () => {
  it('exibe título Cursos', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText('Cursos')).toBeInTheDocument());
  });

  it('exibe lista de cursos após carregar', async () => {
    renderCursos();
    await waitFor(() => {
      expect(screen.getByText('Ciência da Computação')).toBeInTheDocument();
      expect(screen.getByText('Engenharia de Software')).toBeInTheDocument();
    });
  });

  it('exibe badge Inativo para curso inativo', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText('Inativo')).toBeInTheDocument());
  });

  it('exibe estado de carregamento inicialmente', () => {
    mockCursosService.listarAdmin.mockReturnValue(new Promise(() => {}));
    renderCursos();
    expect(screen.getByText('Carregando cursos...')).toBeInTheDocument();
  });

  it('exibe mensagem quando não há cursos', async () => {
    mockCursosService.listarAdmin.mockResolvedValue([]);
    renderCursos();
    await waitFor(() => expect(screen.getByText('Nenhum curso cadastrado ainda.')).toBeInTheDocument());
  });

  it('exibe código do curso', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText('CC-001')).toBeInTheDocument());
  });

  it('exibe total de estudantes', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText('5 alunos')).toBeInTheDocument());
  });

  it('exibe estatística com total de cursos', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText(/2 cursos/)).toBeInTheDocument());
  });

  it('exibe turno e modalidade como badges', async () => {
    renderCursos();
    await waitFor(() => {
      expect(screen.getByText('noturno')).toBeInTheDocument();
      expect(screen.getByText('presencial')).toBeInTheDocument();
    });
  });

  it('exibe carga horária complementar', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText('200h complementares')).toBeInTheDocument());
  });

  it('exibe instituição dos cursos', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getAllByText('Universidade Teste').length).toBeGreaterThan(0));
  });

  it('botão Novo curso está presente', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText('Novo curso')).toBeInTheDocument());
  });
});

describe('Cursos — filtros', () => {
  it('filtra cursos por busca de nome', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Ciência da Computação'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'Engenharia' } });
    expect(screen.queryByText('Ciência da Computação')).not.toBeInTheDocument();
    expect(screen.getByText('Engenharia de Software')).toBeInTheDocument();
  });

  it('busca por código retorna resultado correto', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Ciência da Computação'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'CC-001' } });
    expect(screen.getByText('Ciência da Computação')).toBeInTheDocument();
    expect(screen.queryByText('Engenharia de Software')).not.toBeInTheDocument();
  });

  it('exibe mensagem de nenhum resultado após filtro', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Ciência da Computação'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'xyzinexistente' } });
    await waitFor(() => {
      expect(screen.getByText(/Nenhum curso encontrado para os filtros aplicados/)).toBeInTheDocument();
    });
  });

  it('exibe campo de filtro por instituição', async () => {
    renderCursos();
    await waitFor(() => expect(screen.getByText('Todas as instituições')).toBeInTheDocument());
  });
});

describe('Cursos — modal criar', () => {
  it('abre modal ao clicar em Novo curso', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Novo curso'));
    expect(screen.getByText('Novo curso', { selector: 'h2' })).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Criar curso')).not.toBeInTheDocument();
  });

  it('não chama criar quando nome está vazio', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Criar curso'));
    expect(mockCursosService.criar).not.toHaveBeenCalled();
  });

  it('não chama criar quando instituição não está selecionada', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Novo curso'));
    fireEvent.change(screen.getByPlaceholderText('Ex: Ciência da Computação'), {
      target: { value: 'Novo Curso' },
    });
    fireEvent.click(screen.getByText('Criar curso'));
    expect(mockCursosService.criar).not.toHaveBeenCalled();
  });

  it('chama cursosService.criar com dados válidos', async () => {
    mockCursosService.criar.mockResolvedValue({ id: 'c-3', nome: 'Novo Curso' });
    renderCursos();
    await waitFor(() => screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Novo curso'));

    // Usa o texto único do placeholder do select dentro do modal
    const instSelect = screen.getByText('Selecione uma instituição...').closest('select')!;
    fireEvent.change(instSelect, { target: { value: 'i-1' } });
    fireEvent.change(screen.getByPlaceholderText('Ex: Ciência da Computação'), {
      target: { value: 'Novo Curso Teste' },
    });
    fireEvent.click(screen.getByText('Criar curso'));
    await waitFor(() => expect(mockCursosService.criar).toHaveBeenCalled());
  });

  it('modal exibe select de turno e modalidade', async () => {
    renderCursos();
    await waitFor(() => screen.getByText('Novo curso'));
    fireEvent.click(screen.getByText('Novo curso'));
    expect(screen.getByText('Não definido')).toBeInTheDocument();
    expect(screen.getByText('Não definida')).toBeInTheDocument();
  });
});

describe('Cursos — modal editar', () => {
  it('abre modal de edição ao clicar em Editar', async () => {
    renderCursos();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByText('Salvar alterações')).toBeInTheDocument();
  });

  it('preenche modal com nome do curso', async () => {
    renderCursos();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByDisplayValue('Ciência da Computação')).toBeInTheDocument();
  });

  it('fecha modal de edição ao clicar em Cancelar', async () => {
    renderCursos();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Salvar alterações')).not.toBeInTheDocument();
  });

  it('chama cursosService.atualizar ao salvar edição válida', async () => {
    mockCursosService.atualizar.mockResolvedValue({ id: 'c-1' });
    renderCursos();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Salvar alterações'));
    await waitFor(() =>
      expect(mockCursosService.atualizar).toHaveBeenCalledWith(
        'c-1',
        expect.objectContaining({ nome: 'Ciência da Computação' }),
      ),
    );
  });
});

describe('Cursos — alterar ativo', () => {
  it('chama cursosService.alterarAtivo ao desativar curso ativo', async () => {
    mockCursosService.alterarAtivo.mockResolvedValue({ id: 'c-1', ativo: false });
    renderCursos();
    await waitFor(() => screen.getByText('Desativar'));
    fireEvent.click(screen.getByText('Desativar'));
    await waitFor(() =>
      expect(mockCursosService.alterarAtivo).toHaveBeenCalledWith('c-1', false),
    );
  });

  it('chama cursosService.alterarAtivo ao ativar curso inativo', async () => {
    mockCursosService.alterarAtivo.mockResolvedValue({ id: 'c-2', ativo: true });
    renderCursos();
    await waitFor(() => screen.getByText('Ativar'));
    fireEvent.click(screen.getByText('Ativar'));
    await waitFor(() =>
      expect(mockCursosService.alterarAtivo).toHaveBeenCalledWith('c-2', true),
    );
  });
});
