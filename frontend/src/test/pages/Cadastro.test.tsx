import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { Cadastro } from '../../pages/Cadastro';

const { mockAuthService, mockLogin, mockNavigate, mockCursosService } = vi.hoisted(() => ({
  mockAuthService: { cadastrar: vi.fn() },
  mockLogin: vi.fn(),
  mockNavigate: vi.fn(),
  mockCursosService: { listar: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../../services/auth', () => ({ authService: mockAuthService }));

vi.mock('../../services/cursos', () => ({
  cursosService: mockCursosService,
  // re-export the type alias (Vitest needs the module to have the named export)
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return { ...actual, useAuth: vi.fn(() => ({ login: mockLogin, usuario: null, token: null, logout: vi.fn() })) };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

const CURSOS_MOCK = [
  {
    id: 'c-1', nome: 'Engenharia de Software', codigo: 'UT001', turno: 'matutino', modalidade: 'presencial',
    carga_horaria_complementar: 200, instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste',
    instituicao_sigla: 'UT', dominios_email: ['aluno.ut.edu.br'], ativo: true, criado_em: '', atualizado_em: '',
  },
  {
    id: 'c-2', nome: 'Engenharia de Software', codigo: 'UT002', turno: 'noturno', modalidade: 'presencial',
    carga_horaria_complementar: 200, instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste',
    instituicao_sigla: 'UT', dominios_email: ['aluno.ut.edu.br'], ativo: true, criado_em: '', atualizado_em: '',
  },
  {
    id: 'c-3', nome: 'Ciência da Computação', codigo: 'UT003', turno: 'integral', modalidade: 'presencial',
    carga_horaria_complementar: 200, instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste',
    instituicao_sigla: 'UT', dominios_email: ['aluno.ut.edu.br'], ativo: true, criado_em: '', atualizado_em: '',
  },
  {
    id: 'c-4', nome: 'Administração', codigo: 'OU001', turno: 'vespertino', modalidade: 'presencial',
    carga_horaria_complementar: 200, instituicao_id: 'i-2', instituicao_nome: 'Outra Universidade',
    instituicao_sigla: 'OU', dominios_email: [], ativo: true, criado_em: '', atualizado_em: '',
  },
  {
    id: 'c-5', nome: 'Administração', codigo: 'OU002', turno: null, modalidade: 'ead',
    carga_horaria_complementar: 200, instituicao_id: 'i-2', instituicao_nome: 'Outra Universidade',
    instituicao_sigla: 'OU', dominios_email: [], ativo: true, criado_em: '', atualizado_em: '',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockCursosService.listar.mockResolvedValue(CURSOS_MOCK);
});

describe('Cadastro — renderização', () => {
  it('renderiza o título Criar conta de estudante', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByText('Criar conta de estudante')).toBeInTheDocument());
  });

  it('renderiza o campo de nome', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Nome completo')).toBeInTheDocument());
  });

  it('renderiza o campo de e-mail desabilitado até o turno ser definido', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('E-mail institucional')).toBeDisabled());
  });

  it('renderiza o campo de matrícula', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Matrícula')).toBeInTheDocument());
  });

  it('renderiza o campo de senha', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Senha')).toBeInTheDocument());
  });

  it('renderiza o campo de confirmar senha', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument());
  });

  it('renderiza botão Criar conta', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByText('Criar conta')).toBeInTheDocument());
  });

  it('renderiza link para login', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByText('Entrar')).toBeInTheDocument());
  });

  it('renderiza select de universidade com as instituições disponíveis', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => {
      expect(screen.getByText('Universidade Teste (UT)')).toBeInTheDocument();
      expect(screen.getByText('Outra Universidade (OU)')).toBeInTheDocument();
    });
  });

  it('o select de curso começa desabilitado até escolher a universidade', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Curso')).toBeDisabled());
  });

  it('exibe os cursos da universidade selecionada', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-1' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Curso')).not.toBeDisabled();
      expect(screen.getByText('Ciência da Computação')).toBeInTheDocument();
      expect(screen.getByText('Engenharia de Software')).toBeInTheDocument();
    });
  });

  it('diferencia cursos com o mesmo nome por modalidade e código', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-2' } });

    await waitFor(() => {
      expect(screen.getByText('Administração — Presencial · cód. OU001')).toBeInTheDocument();
      expect(screen.getByText('Administração — EAD · cód. OU002')).toBeInTheDocument();
    });
  });

  it('exibe os turnos do curso selecionado', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-1' } });
    await waitFor(() => screen.getByText('Engenharia de Software'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Engenharia de Software__presencial' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Turno')).not.toBeDisabled();
      expect(screen.getByText('Matutino')).toBeInTheDocument();
      expect(screen.getByText('Noturno')).toBeInTheDocument();
    });
  });

  it('seleciona automaticamente o turno quando há apenas uma opção e libera o e-mail', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-2' } });
    await waitFor(() => screen.getByText('Administração — Presencial · cód. OU001'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Administração__presencial' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Turno')).toHaveValue('vespertino');
      expect(screen.getByLabelText('E-mail institucional')).not.toBeDisabled();
    });
  });
});

describe('Cadastro — validações', () => {
  it('exibe erro quando nome é muito curto', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'A' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
  });

  it('exibe erro quando a universidade não está selecionada', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText('Selecione sua universidade')).toBeInTheDocument();
  });

  it('exibe erro quando o curso não está selecionado', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-1' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText('Selecione seu curso')).toBeInTheDocument();
  });

  it('exibe erro quando o turno não está selecionado e há mais de uma opção', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-1' } });
    await waitFor(() => screen.getByText('Engenharia de Software'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Engenharia de Software__presencial' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText('Selecione o turno do seu curso')).toBeInTheDocument();
  });

  it('exibe erro quando o e-mail não pertence ao domínio da universidade', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-1' } });
    await waitFor(() => screen.getByText('Engenharia de Software'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Engenharia de Software__presencial' } });
    await waitFor(() => expect(screen.getByLabelText('Turno')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('Turno'), { target: { value: 'matutino' } });
    await waitFor(() => expect(screen.getByLabelText('E-mail institucional')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@gmail.com' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/fora do domínio institucional/i)).toBeInTheDocument();
  });

  it('exibe erro quando senha é muito curta', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-2' } });
    await waitFor(() => screen.getByText('Administração — Presencial · cód. OU001'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Administração__presencial' } });
    await waitFor(() => expect(screen.getByLabelText('E-mail institucional')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/mínimo 6 caracteres/i)).toBeInTheDocument();
  });

  it('exibe erro quando senhas não conferem', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-2' } });
    await waitFor(() => screen.getByText('Administração — Presencial · cód. OU001'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Administração__presencial' } });
    await waitFor(() => expect(screen.getByLabelText('E-mail institucional')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senhaXXX' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getAllByText(/As senhas não conferem/i)[0]).toBeInTheDocument();
  });

  it('exibe erro quando matrícula é muito curta', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-2' } });
    await waitFor(() => screen.getByText('Administração — Presencial · cód. OU001'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Administração__presencial' } });
    await waitFor(() => expect(screen.getByLabelText('E-mail institucional')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'joao@uni.edu.br' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: 'A' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/matrícula acadêmica/i)).toBeInTheDocument();
  });

  it('limpa erro ao digitar', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByText('Criar conta'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'A' } });
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    expect(screen.getByText(/mínimo 2 caracteres/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Nome Válido' } });
    expect(screen.queryByText(/mínimo 2 caracteres/i)).not.toBeInTheDocument();
  });
});

describe('Cadastro — toggle senha', () => {
  it('senha começa como password', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password'));
  });

  it('toggle alterna para text', async () => {
    renderWithProviders(<Cadastro />);
    await waitFor(() => screen.getByLabelText('Mostrar senha'));
    fireEvent.click(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
  });
});

describe('Cadastro — submit', () => {
  async function preencherFluxoCompleto() {
    await waitFor(() => screen.getByLabelText('Universidade'));
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: '  Nome Válido  ' } });
    fireEvent.change(screen.getByLabelText('Universidade'), { target: { value: 'i-1' } });
    await waitFor(() => screen.getByText('Engenharia de Software'));
    fireEvent.change(screen.getByLabelText('Curso'), { target: { value: 'Engenharia de Software__presencial' } });
    await waitFor(() => expect(screen.getByLabelText('Turno')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('Turno'), { target: { value: 'noturno' } });
    await waitFor(() => expect(screen.getByLabelText('E-mail institucional')).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('E-mail institucional'), { target: { value: 'JOAO@ALUNO.UT.EDU.BR' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: 'senha123' } });
    fireEvent.change(screen.getByLabelText('Matrícula'), { target: { value: '2021001' } });
  }

  it('chama authService.cadastrar com o curso correspondente ao turno escolhido', async () => {
    mockAuthService.cadastrar.mockResolvedValue({ token: 'tok', usuario: { id: 'u-1', nome: 'Nome Válido', email: 'joao@aluno.ut.edu.br', perfil: 'estudante' } });
    renderWithProviders(<Cadastro />);
    await preencherFluxoCompleto();
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    await waitFor(() => expect(mockAuthService.cadastrar).toHaveBeenCalledWith({
      nome: 'Nome Válido',
      email: 'joao@aluno.ut.edu.br',
      senha: 'senha123',
      matricula: '2021001',
      curso_id: 'c-2',
    }));
    expect(mockLogin).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('exibe erro quando authService.cadastrar rejeita', async () => {
    mockAuthService.cadastrar.mockRejectedValue(new Error('E-mail já cadastrado'));
    renderWithProviders(<Cadastro />);
    await preencherFluxoCompleto();
    await act(async () => {
      fireEvent.submit(screen.getByText('Criar conta').closest('form')!);
    });
    await waitFor(() => expect(screen.getByText(/Falha ao criar conta/i)).toBeInTheDocument());
  });
});
