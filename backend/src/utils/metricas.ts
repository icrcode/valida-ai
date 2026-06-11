import { Registry, Histogram, Counter, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const registro = new Registry();

collectDefaultMetrics({ register: registro });

export const httpDuracaoSegundos = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['metodo', 'rota', 'status'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registro],
});

export const httpRequisicoesTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP recebidas',
  labelNames: ['metodo', 'rota', 'status'],
  registers: [registro],
});

export function medirRequisicoes(req: Request, res: Response, next: NextFunction): void {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracaoSegundos = Number(process.hrtime.bigint() - inicio) / 1e9;
    const rota = req.route ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = {
      metodo: req.method,
      rota,
      status: String(res.statusCode),
    };

    httpDuracaoSegundos.observe(labels, duracaoSegundos);
    httpRequisicoesTotal.inc(labels);
  });

  next();
}
