import { Client } from 'minio';
import { configuracao } from '../configuracao';
import registrador from '../utils/registrador';

const [host, portStr] = configuracao.minio.endpoint.split(':');

const cliente = new Client({
  endPoint: host,
  port: Number.parseInt(portStr || '9000', 10),
  useSSL: configuracao.minio.usarSSL,
  accessKey: configuracao.minio.chaveAcesso,
  secretKey: configuracao.minio.chaveSecreta,
});

const balde = configuracao.minio.balde;

export async function garantirBalde(): Promise<void> {
  const existe = await cliente.bucketExists(balde);
  if (existe) {
    registrador.info(`Balde MinIO já existe: ${balde}`);
  } else {
    await cliente.makeBucket(balde, 'us-east-1');
    registrador.info(`Balde MinIO criado: ${balde}`);
  }
}

export async function fazerUpload(
  buffer: Buffer,
  chaveArquivo: string,
  mimeType: string,
): Promise<string> {
  await cliente.putObject(balde, chaveArquivo, buffer, buffer.length, {
    'Content-Type': mimeType,
  });
  return chaveArquivo;
}

export async function gerarUrlAssinada(
  chaveArquivo: string,
  expiracaoSegundos = 3600,
): Promise<string> {
  return cliente.presignedGetObject(balde, chaveArquivo, expiracaoSegundos);
}

export async function deletarArquivo(chaveArquivo: string): Promise<void> {
  await cliente.removeObject(balde, chaveArquivo);
}
