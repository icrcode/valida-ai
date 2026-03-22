import { Pool } from 'pg';
import { configuracao } from '../configuracao';

export const pool = new Pool({
  host: configuracao.baseDados.servidor,
  port: configuracao.baseDados.porta,
  user: configuracao.baseDados.usuario,
  password: configuracao.baseDados.senha,
  database: configuracao.baseDados.nome,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  console.error('Erro inesperado no pool do banco de dados:', err.message);
});
