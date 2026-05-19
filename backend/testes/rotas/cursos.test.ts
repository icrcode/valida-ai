import request from 'supertest';

jest.mock('../../src/modulos/cursos/repositorio');

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
};

describe('GET /', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna 200 com a lista de cursos', async () => {
    mockRepo.listarCursos.mockResolvedValueOnce([CURSO_MOCK]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].nome).toBe('Ciência da Computação');
    expect(res.body[0].instituicao_nome).toBe('Universidade Teste');
  });

  it('retorna 200 com array vazio quando não há cursos ativos', async () => {
    mockRepo.listarCursos.mockResolvedValueOnce([]);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('retorna múltiplos cursos de instituições diferentes', async () => {
    const cursos = [
      CURSO_MOCK,
      { ...CURSO_MOCK, id: 'curso-2', nome: 'Sistemas de Informação', instituicao_sigla: 'UT2' },
    ];
    mockRepo.listarCursos.mockResolvedValueOnce(cursos);
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('retorna 500 em caso de erro no repositório', async () => {
    mockRepo.listarCursos.mockRejectedValueOnce(new Error('Falha no banco'));
    const res = await request(app).get('/');
    expect(res.status).toBe(500);
    expect(res.body.erro).toBe('Erro interno');
  });
});
