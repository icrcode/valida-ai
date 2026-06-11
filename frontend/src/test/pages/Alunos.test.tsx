import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, USUARIO_COORD } from '../helpers/renderWithProviders';
import { Alunos } from '../../pages/Alunos';
import type { Curso, AlunoDoCurso } from '../../services/cursos';

const { mockCursosService } = vi.hoisted(() => ({
  mockCursosService: { meus: vi.fn(), listarAlunos: vi.fn() },
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock('../../services/cursos', () => ({
  cursosService: mockCursosService,
}));

const CURSOS_MOCK: Curso[] = [
  {
    id: 'curso-1', nome: 'Engenharia de Software', codigo: 'ENG-SW',
    carga_horaria_complementar: 200, turno: 'noite', modalidade: 'presencial',
    instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste', instituicao_sigla: 'UT',
    ativo: true, criado_em: '2024-01-01', atualizado_em: '2024-01-01',
  },
  {
    id: 'curso-2', nome: 'Ciência da Computação', codigo: 'CC',
    carga_horaria_complementar: 200, turno: 'manhã', modalidade: 'presencial',
    instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste', instituicao_sigla: 'UT',
    ativo: true, criado_em: '2024-01-01', atualizado_em: '2024-01-01',
  },
];

const ALUNOS_CURSO_1: AlunoDoCurso[] = [
  { id: 'a-1', nome: 'Maria Silva', email: 'maria@test.com', matricula: '2021001', ativo: true, criado_em: '2024-01-01' },
];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockCursosService.meus.mockResolvedValue([]);
  mockCursosService.listarAlunos.mockResolvedValue([]);
});

describe('Alunos', () => {
  it('exibe mensagem quando o coordenador não tem cursos', async () => {
    renderWithProviders(<Alunos />, { token: 'tok', usuario: USUARIO_COORD });
    await waitFor(() =>
      expect(screen.getByText('Você ainda não está vinculado a nenhum curso.')).toBeInTheDocument(),
    );
  });

  it('exibe abas para cada curso do coordenador e carrega os alunos do primeiro', async () => {
    mockCursosService.meus.mockResolvedValue(CURSOS_MOCK);
    mockCursosService.listarAlunos.mockResolvedValue(ALUNOS_CURSO_1);

    renderWithProviders(<Alunos />, { token: 'tok', usuario: USUARIO_COORD });

    await waitFor(() => {
      expect(screen.getByText('Engenharia de Software')).toBeInTheDocument();
      expect(screen.getByText('Ciência da Computação')).toBeInTheDocument();
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    });
    expect(mockCursosService.listarAlunos).toHaveBeenCalledWith('curso-1');
  });

  it('troca de curso ao clicar em outra aba', async () => {
    mockCursosService.meus.mockResolvedValue(CURSOS_MOCK);
    mockCursosService.listarAlunos.mockResolvedValue([]);

    renderWithProviders(<Alunos />, { token: 'tok', usuario: USUARIO_COORD });

    await waitFor(() => expect(screen.getByText('Ciência da Computação')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Ciência da Computação'));

    await waitFor(() => expect(mockCursosService.listarAlunos).toHaveBeenCalledWith('curso-2'));
  });

  it('exibe mensagem quando o curso não tem alunos', async () => {
    mockCursosService.meus.mockResolvedValue(CURSOS_MOCK);
    mockCursosService.listarAlunos.mockResolvedValue([]);

    renderWithProviders(<Alunos />, { token: 'tok', usuario: USUARIO_COORD });

    await waitFor(() =>
      expect(screen.getByText('Nenhum aluno vinculado a este curso.')).toBeInTheDocument(),
    );
  });
});
