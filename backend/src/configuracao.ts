import dotenv from 'dotenv';

dotenv.config();

export const configuracao = {
  ambienteNode: process.env.NODE_ENV || 'development',
  porta: parseInt(process.env.PORT || '3000', 10),
  nivelLog: process.env.LOG_LEVEL || 'info',

  baseDados: {
    servidor: process.env.DB_HOST || 'localhost',
    porta: parseInt(process.env.DB_PORT || '5432', 10),
    usuario: process.env.DB_USER || 'postgres',
    senha: process.env.DB_PASSWORD || 'postgres',
    nome: process.env.DB_NAME || 'valida_db',
  },

  redis: {
    servidor: process.env.REDIS_HOST || 'localhost',
    porta: parseInt(process.env.REDIS_PORT || '6379', 10),
    senha: process.env.REDIS_PASSWORD || '',
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost:9000',
    chaveAcesso: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    chaveSecreta: process.env.MINIO_SECRET_KEY || 'minioadmin',
    balde: process.env.MINIO_BUCKET || 'valida-files',
    usarSSL: process.env.MINIO_USE_SSL === 'true',
  },

  jwt: {
    segredo: process.env.JWT_SECRET || 'sua-chave-secreta-aqui',
    expiraEm: process.env.JWT_EXPIRES_IN || '7d',
  },
};
