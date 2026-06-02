import dotenv from 'dotenv';

dotenv.config();

function obrigatorio(nome: string): string {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(
      `Variavel de ambiente obrigatoria nao definida: ${nome}. Configure o arquivo .env.`,
    );
  }
  return valor;
}

export const configuracao = {
  ambienteNode: process.env.NODE_ENV || 'development',
  porta: Number.parseInt(process.env.PORT || '3000', 10),
  nivelLog: process.env.LOG_LEVEL || 'info',

  baseDados: {
    servidor: process.env.DB_HOST || 'localhost',
    porta: Number.parseInt(process.env.DB_PORT || '5432', 10),
    usuario: process.env.DB_USER || 'postgres',
    senha: process.env.DB_PASSWORD || 'postgres',
    nome: process.env.DB_NAME || 'valida_db',
  },

  redis: {
    servidor: process.env.REDIS_HOST || 'localhost',
    porta: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
    senha: process.env.REDIS_PASSWORD || '',
  },

  s3: {
    regiao: process.env.AWS_REGION || 'sa-east-1',
    chaveAcesso: obrigatorio('AWS_ACCESS_KEY_ID'),
    chaveSecreta: obrigatorio('AWS_SECRET_ACCESS_KEY'),
    balde: process.env.AWS_S3_BUCKET || 'valida-balde-files',
    baldeCertificados: process.env.AWS_S3_BUCKET_CERTIFICADOS || 'valida-balde-certificados',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcarCaminhoEstilo: process.env.S3_FORCE_PATH_STYLE === 'true',
  },

  jwt: {
    segredo: obrigatorio('JWT_SECRET'),
    expiraEm: process.env.JWT_EXPIRES_IN || '7d',
  },
};
