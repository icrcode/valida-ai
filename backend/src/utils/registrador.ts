import winston from 'winston';
import { configuracao } from '../configuracao';

const registrador = winston.createLogger({
  level: configuracao.nivelLog,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      const mensagemBase = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      return stack ? `${mensagemBase}\n${stack}` : mensagemBase;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: 'logs/erro.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combinado.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

export default registrador;
