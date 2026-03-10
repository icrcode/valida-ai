import aplicativo from './aplicativo';
import registrador from './utils/registrador';
import { configuracao } from './configuracao';

const PORTA = configuracao.porta;

const servidor = aplicativo.listen(PORTA, () => {
  registrador.info(`🚀 Servidor rodando na porta ${PORTA}`);
  registrador.info(`📝 Ambiente: ${configuracao.ambienteNode}`);
  registrador.info(`🏥 Verificação de saúde disponível em http://localhost:${PORTA}/verificacao`);
});

// Encerramento gracioso
process.on('SIGTERM', () => {
  registrador.info('Sinal SIGTERM recebido: fechando servidor HTTP');
  servidor.close(() => {
    registrador.info('Servidor HTTP fechado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  registrador.info('Sinal SIGINT recebido: fechando servidor HTTP');
  servidor.close(() => {
    registrador.info('Servidor HTTP fechado');
    process.exit(0);
  });
});

process.on('unhandledRejection', (motivo) => {
  registrador.error(`Rejeição não tratada em: ${motivo}`);
  process.exit(1);
});

process.on('uncaughtException', (erro) => {
  registrador.error(`Exceção não capturada: ${erro.message}`);
  process.exit(1);
});
