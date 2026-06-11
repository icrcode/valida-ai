import request from 'supertest';

jest.mock('../../src/modulos/cursos/repositorio');
jest.mock('../../src/middleware/autenticacao', () =>
  require('../helpers/mocks').criarModuloAutenticacao('coord-1', 'coordenador', 'coord@test.com', 'Coordenador Teste', 'curso-1', ['curso-1', 'curso-2'])
);
jest.mock('../../src/middleware/autorizacao', () =>
  require('../helpers/mocks').moduloAutorizacao
);

import * as repositorio from '../../src/modulos/cursos/repositorio';
import router from '../../src/modulos/cursos/rotas';
import { criarApp } from '../helpers/app';

const mockRepo = repositorio as jest.Mocked<typeof repositorio>;
const app = criarApp(router);

const CURSO_MOCK: repositorio.Curso = {
  id: 'curso-1',
  nome: 'Ciência da Computação',
  codigo: 'CC001',
  carga_horaria_complementar: 200,
  turno: 'noturno',
  modalidade: 'presencial',
  instituicao_id: 'inst-1',
  instituicao_nome: 'Universidade Teste',
  instituicao_sigla: 'UT',
  ativo: true,
  criado_em: new Date(),
  atualizado_em: new Date(),
};

describe('GET /', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com a lista de cursos', async () => {
    mockRepo.listarCursosAtivos.mockResolvedValueOnce([CURSO_MOCK]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nome).toBe('Ciência da Computação');
    expect(res.body[0].instituicao_nome).toBe('Universidade Teste');
  });

  it('retorna 200 com array vazio quando não há cursos ativos', async () => {
    mockRepo.listarCursosAtivos.mockResolvedValueOnce([]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('retorna múltiplos cursos de instituições diferentes', async () => {
    const cursos = [
      CURSO_MOCK,
      { ...CURSO_MOCK, id: 'curso-2', nome: 'Sistemas de Informação', instituicao_sigla: 'UT2' },
    ];
    mockRepo.listarCursosAtivos.mockResolvedValueOnce(cursos);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.listarCursosAtivos.mockRejectedValueOnce(new Error('Falha no banco'));
    const res = await request(app).get('/');
    expect(res.status).toBe(500);
    expect(res.body.erro).toBe('Erro interno');
  });
});

describe('GET /meus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna os cursos pelos quais o coordenador é responsável', async () => {
    mockRepo.listarCursosDoCoordenador.mockResolvedValueOnce([CURSO_MOCK]);
    const res = await request(app).get('/meus');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockRepo.listarCursosDoCoordenador).toHaveBeenCalledWith('coord-1');
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.listarCursosDoCoordenador.mockRejectedValueOnce(new Error('Falha no banco'));
    const res = await request(app).get('/meus');
    expect(res.status).toBe(500);
  });
});

describe('GET /:id/alunos', () => {
  const ALUNO_MOCK: repositorio.AlunoDoCurso = {
    id: 'est-1',
    nome: 'João Silva',
    email: 'joao@uni.edu',
    matricula: '2021001',
    ativo: true,
    criado_em: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com a lista de alunos quando o coordenador tem acesso ao curso', async () => {
    mockRepo.coordenadorTemCurso.mockResolvedValueOnce(true);
    mockRepo.buscarCursoPorId.mockResolvedValueOnce({ ...CURSO_MOCK, dominios_email: null });
    mockRepo.listarAlunosDoCurso.mockResolvedValueOnce([ALUNO_MOCK]);

    const res = await request(app).get('/curso-1/alunos');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('João Silva');
  });

  it('retorna 403 quando o coordenador não é responsável pelo curso', async () => {
    mockRepo.coordenadorTemCurso.mockResolvedValueOnce(false);

    const res = await request(app).get('/curso-3/alunos');

    expect(res.status).toBe(403);
    expect(mockRepo.listarAlunosDoCurso).not.toHaveBeenCalled();
  });

  it('retorna 404 quando o curso não existe', async () => {
    mockRepo.coordenadorTemCurso.mockResolvedValueOnce(true);
    mockRepo.buscarCursoPorId.mockResolvedValueOnce(null);

    const res = await request(app).get('/curso-1/alunos');

    expect(res.status).toBe(404);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.coordenadorTemCurso.mockRejectedValueOnce(new Error('Falha no banco'));

    const res = await request(app).get('/curso-1/alunos');

    expect(res.status).toBe(500);
  });
});
