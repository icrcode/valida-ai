import request from 'supertest';
import express from 'express';
import roteador from '../../src/routes/verificacao';

const app = express();
app.use(roteador);

describe('GET /verificacao', () => {
  it('retorna 200 com status ok', async () => {
    const res = await request(app).get('/verificacao');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.servico).toBe('valida-api');
  });

  it('retorna timestamp no formato ISO', async () => {
    const res = await request(app).get('/verificacao');
    expect(() => new Date(res.body.timestamp)).not.toThrow();
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('retorna tempoLigado como número', async () => {
    const res = await request(app).get('/verificacao');
    expect(typeof res.body.tempoLigado).toBe('number');
    expect(res.body.tempoLigado).toBeGreaterThanOrEqual(0);
  });
});
