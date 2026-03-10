import { Router, Request, Response } from 'express';
import registrador from '../utils/registrador';

const roteador = Router();

interface RespostaVerificacao {
  status: 'ok' | 'indisponivel';
  timestamp: string;
  servico: string;
  tempoLigado: number;
}

roteador.get('/verificacao', (_req: Request, res: Response<RespostaVerificacao>) => {
  registrador.info('Verificação de saúde solicitada');

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    servico: 'valida-api',
    tempoLigado: process.uptime(),
  });
});

export default roteador;
