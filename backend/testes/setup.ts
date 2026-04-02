import { config } from 'dotenv';
import { resolve } from 'node:path';

// Carrega variáveis de ambiente do arquivo .env.test (nunca commitado)
// Copie .env.test.example para .env.test e preencha os valores
config({ path: resolve(__dirname, '../.env.test') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não definido. Copie .env.test.example para .env.test e configure os valores.');
}
