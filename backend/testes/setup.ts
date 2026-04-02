// Variáveis de ambiente para o ambiente de testes
// Devem ser definidas antes de qualquer import de módulo
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'segredo-de-teste';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_NAME = 'valida_test';
process.env.MINIO_ENDPOINT = 'localhost:9000';
