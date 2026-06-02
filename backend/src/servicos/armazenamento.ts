import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { configuracao } from '../configuracao';
import registrador from '../utils/registrador';

const cliente = new S3Client({
  region: configuracao.s3.regiao,
  credentials: {
    accessKeyId: configuracao.s3.chaveAcesso,
    secretAccessKey: configuracao.s3.chaveSecreta,
  },
  ...(configuracao.s3.endpoint && {
    endpoint: configuracao.s3.endpoint,
    forcePathStyle: configuracao.s3.forcarCaminhoEstilo,
  }),
});

const balde = configuracao.s3.balde;
const baldeCertificados = configuracao.s3.baldeCertificados;

async function verificarBalde(nome: string): Promise<void> {
  try {
    await cliente.send(new HeadBucketCommand({ Bucket: nome }));
    registrador.info(`Bucket S3 acessível: ${nome}`);
  } catch {
    registrador.warn(
      `Bucket S3 não encontrado ou sem acesso: ${nome}. Verifique a configuração AWS.`,
    );
  }
}

export async function garantirBalde(): Promise<void> {
  await verificarBalde(balde);
}

export async function garantirBaldeCertificados(): Promise<void> {
  await verificarBalde(baldeCertificados);
}

export async function fazerUpload(
  buffer: Buffer,
  chaveArquivo: string,
  mimeType: string,
): Promise<string> {
  await cliente.send(
    new PutObjectCommand({
      Bucket: balde,
      Key: chaveArquivo,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
  return chaveArquivo;
}

export async function gerarUrlAssinada(
  chaveArquivo: string,
  expiracaoSegundos = 3600,
): Promise<string> {
  const comando = new GetObjectCommand({ Bucket: balde, Key: chaveArquivo });
  return getSignedUrl(cliente, comando, { expiresIn: expiracaoSegundos });
}

export async function deletarArquivo(chaveArquivo: string): Promise<void> {
  await cliente.send(new DeleteObjectCommand({ Bucket: balde, Key: chaveArquivo }));
}

export async function fazerUploadCertificado(
  buffer: Buffer,
  chaveArquivo: string,
): Promise<string> {
  await cliente.send(
    new PutObjectCommand({
      Bucket: baldeCertificados,
      Key: chaveArquivo,
      Body: buffer,
      ContentType: 'application/pdf',
    }),
  );
  return chaveArquivo;
}

export async function gerarUrlAssinadaCertificado(
  chaveArquivo: string,
  expiracaoSegundos = 3600,
): Promise<string> {
  const comando = new GetObjectCommand({ Bucket: baldeCertificados, Key: chaveArquivo });
  return getSignedUrl(cliente, comando, { expiresIn: expiracaoSegundos });
}
