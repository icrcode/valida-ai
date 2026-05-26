import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import registrador from './utils/registrador';
import rotasVerificacao from './routes/verificacao';
import rotasPublica from './routes/publica';
import rotasAuth from './modulos/auth/rotas';
import rotasUsuarios from './modulos/usuarios/rotas';
import rotasDocumentos from './modulos/documentos/rotas';
import rotasValidacao from './modulos/validacao/rotas';
import rotasCertificados from './modulos/certificados/rotas';
import rotasCursos from './modulos/cursos/rotas';
import rotasInstituicoes from './modulos/instituicoes/rotas';
import { garantirBalde, garantirBaldeCertificados } from './servicos/armazenamento';
import { registrarHandlers } from './eventos/registrar';

const aplicativo: Express = express();

// Middlewares de segurança
aplicativo.use(helmet());

const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

aplicativo.use(
  cors({
    origin: (origem, callback) => {
      if (!origem || origensPermitidas.includes(origem)) {
        callback(null, true);
      } else {
        callback(new Error('Origem não permitida pelo CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Analisador de corpo
aplicativo.use(express.json({ limit: '10mb' }));
aplicativo.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware de registro
aplicativo.use((req, _res, next) => {
  registrador.info(`${req.method} ${req.path}`);
  next();
});

// Rotas
aplicativo.use('/', rotasVerificacao);
aplicativo.use('/api/publica', rotasPublica);
aplicativo.use('/api/auth', rotasAuth);
aplicativo.use('/api/usuarios', rotasUsuarios);
aplicativo.use('/api/documentos', rotasDocumentos);
aplicativo.use('/api/documentos', rotasValidacao);
aplicativo.use('/api/certificados', rotasCertificados);
aplicativo.use('/api/cursos', rotasCursos);
aplicativo.use('/api/instituicoes', rotasInstituicoes);

// Manipulador de 404
aplicativo.use((_req, res) => {
  res.status(404).json({
    erro: 'Não Encontrado',
    mensagem: 'O endpoint solicitado não existe',
  });
});

// Manipulador de erros
aplicativo.use((err: unknown, _req: express.Request, res: express.Response) => {
  const mensagem = err instanceof Error ? err.message : 'Erro Interno do Servidor';
  const status = (err as { status?: number }).status || 500;

  registrador.error(mensagem);
  res.status(status).json({ erro: mensagem, status });
});

// Registrar handlers de eventos
registrarHandlers();

// Verificar acesso aos buckets S3
garantirBalde().catch((err: unknown) => {
  const mensagem = err instanceof Error ? err.message : String(err);
  registrador.warn(`Não foi possível verificar o bucket S3: ${mensagem}`);
});

garantirBaldeCertificados().catch((err: unknown) => {
  const mensagem = err instanceof Error ? err.message : String(err);
  registrador.warn(`Não foi possível verificar o bucket S3 de certificados: ${mensagem}`);
});

export default aplicativo;
