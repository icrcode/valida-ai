import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import registrador from './utils/registrador';
import rotasVerificacao from './routes/verificacao';

const aplicativo: Express = express();

// Middlewares de segurança
aplicativo.use(helmet());
aplicativo.use(cors());

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

// Manipulador de 404
aplicativo.use((_req, res) => {
  res.status(404).json({
    erro: 'Não Encontrado',
    mensagem: 'O endpoint solicitado não existe',
  });
});

// Manipulador de erros
aplicativo.use((err: any, _req: express.Request, res: express.Response) => {
  registrador.error(err.message);

  const status = err.status || 500;
  const mensagem = err.message || 'Erro Interno do Servidor';

  res.status(status).json({
    erro: mensagem,
    status,
  });
});

export default aplicativo;
