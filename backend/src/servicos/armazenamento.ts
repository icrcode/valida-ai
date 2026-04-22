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
const baldeCertificados = configuracao.minio.baldeCertificados;

async function garantirBaldeGenerico(nome: string): Promise<void> {
  const existe = await cliente.bucketExists(nome);
  if (existe) {
    registrador.info(`Balde MinIO já existe: ${nome}`);
  } else {
    await cliente.makeBucket(nome, 'us-east-1');
    registrador.info(`Balde MinIO criado: ${nome}`);
  }
}

export async function garantirBalde(): Promise<void> {
  await garantirBaldeGenerico(balde);
}

export async function garantirBaldeCertificados(): Promise<void> {
  await garantirBaldeGenerico(baldeCertificados);
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

export async function fazerUploadCertificado(
  buffer: Buffer,
  chaveArquivo: string,
): Promise<string> {
  await cliente.putObject(baldeCertificados, chaveArquivo, buffer, buffer.length, {
    'Content-Type': 'application/pdf',
  });
  return chaveArquivo;
}

export async function gerarUrlAssinadaCertificado(
  chaveArquivo: string,
  expiracaoSegundos = 3600,
): Promise<string> {
  return cliente.presignedGetObject(baldeCertificados, chaveArquivo, expiracaoSegundos);
}
