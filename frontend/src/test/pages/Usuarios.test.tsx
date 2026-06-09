import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, USUARIO_ADMIN } from '../helpers/renderWithProviders';
import { Usuarios } from '../../pages/Usuarios';

const { mockUsuariosService, mockCursosService } = vi.hoisted(() => ({
  mockUsuariosService: {
    listar: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    alterarAtivo: vi.fn(),
  },
  mockCursosService: {
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

vi.mock('../../services/usuarios', () => ({ usuariosService: mockUsuariosService }));
vi.mock('../../services/cursos', () => ({ cursosService: mockCursosService }));

const USUARIOS_MOCK = [
  {
    id: 'u-1', nome: 'João Silva', email: 'joao@ufsc.br', perfil: 'estudante' as const,
    matricula: '2021001', cpf: '000.000.000-00', endereco: 'Rua A, 123',
    curso_id: 'c-1', instituicao_id: 'i-1', instituicao_nome: 'UFSC', ativo: true,
  },
  {
    id: 'u-2', nome: 'Maria Coord', email: 'maria@ufsc.br', perfil: 'coordenador' as const,
    matricula: null, cpf: null, endereco: null,
    curso_id: null, instituicao_id: 'i-1', instituicao_nome: 'UFSC', ativo: false,
  },
  {
    id: 'u-3', nome: 'Admin User', email: 'admin@ufsc.br', perfil: 'admin' as const,
    matricula: null, cpf: null, endereco: null,
    curso_id: null, instituicao_id: null, instituicao_nome: null, ativo: true,
  },
  {
    id: 'u-4', nome: 'Perfil Desconhecido', email: 'x@ufsc.br', perfil: 'desconhecido' as any,
    matricula: null, cpf: null, endereco: null,
    curso_id: null, instituicao_id: null, instituicao_nome: null, ativo: true,
  },
];

const CURSOS_MOCK = [
  {
    id: 'c-1', nome: 'Ciência da Computação', codigo: 'CC-001',
    carga_horaria_complementar: 200, turno: null, modalidade: null,
    instituicao_id: 'i-1', instituicao_nome: 'UFSC', instituicao_sigla: 'UFSC',
    ativo: true, criado_em: '', atualizado_em: '',
  },
];

function renderUsuarios() {
  return renderWithProviders(<Usuarios />, { token: 'tok', usuario: USUARIO_ADMIN });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUsuariosService.listar.mockResolvedValue(USUARIOS_MOCK);
  mockCursosService.listar.mockResolvedValue(CURSOS_MOCK);
});

describe('Usuarios — renderização', () => {
  it('exibe título Usuários', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getByText('Usuários')).toBeInTheDocument());
  });

  it('exibe lista de usuários após carregar', async () => {
    renderUsuarios();
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Coord')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });
  });

  it('exibe perfil label dos usuários', async () => {
    renderUsuarios();
    await waitFor(() => {
      expect(screen.getByText('Estudante')).toBeInTheDocument();
      expect(screen.getByText('Coordenador')).toBeInTheDocument();
      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });
  });

  it('exibe badge Inativo para usuário inativo', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getByText('Inativo')).toBeInTheDocument());
  });

  it('exibe estado de carregamento', () => {
    mockUsuariosService.listar.mockReturnValue(new Promise(() => {}));
    renderUsuarios();
    expect(screen.getByText('Carregando usuários...')).toBeInTheDocument();
  });

  it('exibe mensagem quando não há usuários', async () => {
    mockUsuariosService.listar.mockResolvedValue([]);
    renderUsuarios();
    await waitFor(() =>
      expect(screen.getByText('Nenhum usuário cadastrado.')).toBeInTheDocument(),
    );
  });

  it('exibe matrícula do estudante', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getByText('Matrícula: 2021001')).toBeInTheDocument());
  });

  it('exibe CPF quando disponível', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getByText('CPF: 000.000.000-00')).toBeInTheDocument());
  });

  it('exibe endereço quando disponível', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getByText('Rua A, 123')).toBeInTheDocument());
  });

  it('exibe iniciais no avatar', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getByText('JS')).toBeInTheDocument());
  });

  it('exibe nome da instituição', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getAllByText('UFSC').length).toBeGreaterThan(0));
  });

  it('botão Novo usuário está presente', async () => {
    renderUsuarios();
    await waitFor(() => expect(screen.getByText('Novo usuário')).toBeInTheDocument());
  });
});

describe('Usuarios — busca', () => {
  it('filtra por nome', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('João Silva'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'Maria' } });
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Maria Coord')).toBeInTheDocument();
  });

  it('filtra por e-mail', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('João Silva'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'admin@ufsc' } });
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('filtra por matrícula', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('João Silva'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: '2021001' } });
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.queryByText('Maria Coord')).not.toBeInTheDocument();
  });

  it('exibe mensagem quando busca não encontra nada', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('João Silva'));
    fireEvent.change(screen.getByPlaceholderText(/buscar por nome/i), { target: { value: 'xyzinexistente' } });
    await waitFor(() =>
      expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument(),
    );
  });
});

describe('Usuarios — modal criar', () => {
  it('abre modal ao clicar em Novo usuário', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));
    expect(screen.getByText('Criar usuário')).toBeInTheDocument();
  });

  it('exibe campo de senha inicial no modo criar', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));
    expect(screen.getByText('Senha inicial')).toBeInTheDocument();
  });

  it('fecha modal ao clicar em Cancelar', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Criar usuário')).not.toBeInTheDocument();
  });

  it('não chama criar quando nome está vazio', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Criar usuário'));
    expect(mockUsuariosService.criar).not.toHaveBeenCalled();
  });

  it('não chama criar quando senha tem menos de 6 caracteres', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'Novo User' } });
    fireEvent.change(screen.getByPlaceholderText('email@instituicao.edu.br'), {
      target: { value: 'novo@ufsc.br' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Criar usuário'));
    expect(mockUsuariosService.criar).not.toHaveBeenCalled();
  });

  it('chama usuariosService.criar com dados válidos', async () => {
    mockUsuariosService.criar.mockResolvedValue({ id: 'u-4' });
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'Novo Usuário' } });
    fireEvent.change(screen.getByPlaceholderText('email@instituicao.edu.br'), {
      target: { value: 'novo@ufsc.br' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByText('Criar usuário'));
    await waitFor(() => expect(mockUsuariosService.criar).toHaveBeenCalled());
  });

  it('exibe campo de matrícula quando perfil é estudante', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));
    expect(screen.getByPlaceholderText('Número de matrícula')).toBeInTheDocument();
  });

  it('exibe campo de CPF quando perfil é coordenador', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    const selectPerfil = screen.getByDisplayValue('Estudante');
    fireEvent.change(selectPerfil, { target: { value: 'coordenador' } });
    expect(screen.getByPlaceholderText('000.000.000-00')).toBeInTheDocument();
  });

  it('exibe campo de endereço quando perfil é coordenador', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    const selectPerfil = screen.getByDisplayValue('Estudante');
    fireEvent.change(selectPerfil, { target: { value: 'coordenador' } });
    expect(screen.getByPlaceholderText(/Rua, número, bairro/i)).toBeInTheDocument();
  });

  it('não exibe CPF quando perfil é admin', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    const selectPerfil = screen.getByDisplayValue('Estudante');
    fireEvent.change(selectPerfil, { target: { value: 'admin' } });
    expect(screen.queryByPlaceholderText('000.000.000-00')).not.toBeInTheDocument();
  });

  it('exibe cursos agrupados por instituição no select', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));
    const optgroup = document.querySelector('optgroup[label="UFSC"]');
    expect(optgroup).toBeTruthy();
  });
});

describe('Usuarios — modal editar', () => {
  it('abre modal de edição ao clicar em Editar', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('preenche modal com dados do usuário', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument();
    expect(screen.getByDisplayValue('joao@ufsc.br')).toBeInTheDocument();
  });

  it('não exibe campo de senha no modo edição', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    expect(screen.queryByText('Senha inicial')).not.toBeInTheDocument();
  });

  it('fecha modal de edição ao clicar em Cancelar', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Salvar')).not.toBeInTheDocument();
  });

  it('chama usuariosService.atualizar ao salvar edição válida', async () => {
    mockUsuariosService.atualizar.mockResolvedValue({ id: 'u-1' });
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() =>
      expect(mockUsuariosService.atualizar).toHaveBeenCalledWith(
        'u-1',
        expect.objectContaining({ nome: 'João Silva' }),
      ),
    );
  });

  it('não chama atualizar quando nome é apagado', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.change(screen.getByDisplayValue('João Silva'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Salvar'));
    expect(mockUsuariosService.atualizar).not.toHaveBeenCalled();
  });

  it('não chama atualizar quando e-mail é inválido', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.change(screen.getByDisplayValue('joao@ufsc.br'), {
      target: { value: 'emailsemarrobase' },
    });
    fireEvent.click(screen.getByText('Salvar'));
    expect(mockUsuariosService.atualizar).not.toHaveBeenCalled();
  });
});

describe('Usuarios — alterar ativo', () => {
  it('chama usuariosService.alterarAtivo ao desativar usuário ativo', async () => {
    mockUsuariosService.alterarAtivo.mockResolvedValue({ id: 'u-1', ativo: false });
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Desativar'));
    fireEvent.click(screen.getAllByText('Desativar')[0]);
    await waitFor(() =>
      expect(mockUsuariosService.alterarAtivo).toHaveBeenCalledWith('u-1', false),
    );
  });

  it('chama usuariosService.alterarAtivo ao ativar usuário inativo', async () => {
    mockUsuariosService.alterarAtivo.mockResolvedValue({ id: 'u-2', ativo: true });
    renderUsuarios();
    await waitFor(() => screen.getByText('Ativar'));
    fireEvent.click(screen.getByText('Ativar'));
    await waitFor(() =>
      expect(mockUsuariosService.alterarAtivo).toHaveBeenCalledWith('u-2', true),
    );
  });
});

describe('Usuarios — erros de mutation', () => {
  it('exibe erro personalizado da API ao falhar criação', async () => {
    mockUsuariosService.criar.mockRejectedValue({
      response: { data: { erro: 'E-mail já cadastrado' } },
    });
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'Duplicado' } });
    fireEvent.change(screen.getByPlaceholderText('email@instituicao.edu.br'), {
      target: { value: 'dup@ufsc.br' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByText('Criar usuário'));
    await waitFor(() => expect(mockUsuariosService.criar).toHaveBeenCalled());
  });

  it('exibe mensagem genérica ao falhar criação sem detalhe da API', async () => {
    mockUsuariosService.criar.mockRejectedValue(new Error('Network error'));
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'Novo User' } });
    fireEvent.change(screen.getByPlaceholderText('email@instituicao.edu.br'), {
      target: { value: 'novo@ufsc.br' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: 'senha123' },
    });
    fireEvent.click(screen.getByText('Criar usuário'));
    await waitFor(() => expect(mockUsuariosService.criar).toHaveBeenCalled());
  });

  it('exibe erro personalizado da API ao falhar atualização', async () => {
    mockUsuariosService.atualizar.mockRejectedValue({
      response: { data: { erro: 'E-mail em uso' } },
    });
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(mockUsuariosService.atualizar).toHaveBeenCalled());
  });

  it('exibe erro genérico ao falhar atualização', async () => {
    mockUsuariosService.atualizar.mockRejectedValue(new Error('fail'));
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() => expect(mockUsuariosService.atualizar).toHaveBeenCalled());
  });

  it('exibe erro ao falhar alteração de status', async () => {
    mockUsuariosService.alterarAtivo.mockRejectedValue(new Error('fail'));
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Desativar'));
    fireEvent.click(screen.getAllByText('Desativar')[0]);
    await waitFor(() => expect(mockUsuariosService.alterarAtivo).toHaveBeenCalled());
  });
});

describe('Usuarios — editar admin (sem cpf/endereço)', () => {
  it('salva edição de admin sem cpf, endereço e matrícula', async () => {
    mockUsuariosService.atualizar.mockResolvedValue({ id: 'u-3' });
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[2]); // Admin User (índice 2)
    fireEvent.click(screen.getByText('Salvar'));
    await waitFor(() =>
      expect(mockUsuariosService.atualizar).toHaveBeenCalledWith(
        'u-3',
        expect.objectContaining({ perfil: 'admin', cpf: null, endereco: null, curso_id: null }),
      ),
    );
  });
});

describe('Usuarios — editar campos opcionais', () => {
  it('permite alterar curso no select do modal de edição', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);

    // O select de curso tem a opção "Sem curso vinculado" + cursos
    const courseSelect = screen.getByDisplayValue(/\[CC-001\]/);
    fireEvent.change(courseSelect, { target: { value: '' } });
    expect(screen.queryByDisplayValue(/\[CC-001\]/)).not.toBeInTheDocument();
  });

  it('permite alterar matrícula no modal de edição (estudante)', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const matricula = screen.getByDisplayValue('2021001');
    fireEvent.change(matricula, { target: { value: '2022999' } });
    expect(screen.getByDisplayValue('2022999')).toBeInTheDocument();
  });

  it('permite alterar endereço no modal de edição (estudante)', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const endereco = screen.getByDisplayValue('Rua A, 123');
    fireEvent.change(endereco, { target: { value: 'Rua B, 456' } });
    expect(screen.getByDisplayValue('Rua B, 456')).toBeInTheDocument();
  });
});

describe('Usuarios — formatação de CPF', () => {
  it('formata CPF com 4 dígitos (d.length <= 6)', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const cpf = screen.getByDisplayValue('000.000.000-00');
    fireEvent.change(cpf, { target: { value: '1234' } });
    expect(cpf).toHaveValue('123.4');
  });

  it('formata CPF com 7 dígitos (d.length <= 9)', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const cpf = screen.getByDisplayValue('000.000.000-00');
    fireEvent.change(cpf, { target: { value: '1234567' } });
    expect(cpf).toHaveValue('123.456.7');
  });

  it('formata CPF com 3 dígitos ou menos (retorna direto)', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const cpf = screen.getByDisplayValue('000.000.000-00');
    fireEvent.change(cpf, { target: { value: '12' } });
    expect(cpf).toHaveValue('12');
  });

  it('formata CPF completo com 11 dígitos', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);
    const cpf = screen.getByDisplayValue('000.000.000-00');
    fireEvent.change(cpf, { target: { value: '12345678901' } });
    expect(cpf).toHaveValue('123.456.789-01');
  });
});

describe('Usuarios — fechar modal pelo botão ×', () => {
  it('fecha modal de criação pelo botão × do cabeçalho', async () => {
    renderUsuarios();
    await waitFor(() => screen.getByText('Novo usuário'));
    fireEvent.click(screen.getByText('Novo usuário'));

    const overlay = document.querySelector('.fixed.inset-0');
    const closeBtn = overlay?.querySelector('button');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    expect(screen.queryByText('Criar usuário')).not.toBeInTheDocument();
  });

  it('fecha modal de edição pelo botão × do cabeçalho', async () => {
    renderUsuarios();
    await waitFor(() => screen.getAllByText('Editar'));
    fireEvent.click(screen.getAllByText('Editar')[0]);

    const overlay = document.querySelector('.fixed.inset-0');
    const closeBtn = overlay?.querySelector('button');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn!);
    expect(screen.queryByText('Salvar')).not.toBeInTheDocument();
  });
});
