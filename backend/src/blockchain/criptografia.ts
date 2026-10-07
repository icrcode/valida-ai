import crypto from 'node:crypto';

/**
 * Primitivas criptográficas usadas pela blockchain de documentos.
 *
 * - SHA-256 para hashes de blocos, transações, arquivos e árvore de Merkle.
 * - Ed25519 para assinatura digital dos blocos pelo validador (Proof of Authority).
 * - Serialização canônica (chaves ordenadas) para que o mesmo objeto gere sempre o mesmo hash.
 */

export function sha256(dados: string | Buffer): string {
  return crypto.createHash('sha256').update(dados).digest('hex');
}

/**
 * JSON determinístico: ordena as chaves recursivamente.
 * Sem isso, { a, b } e { b, a } produziriam hashes diferentes.
 */
export function serializarCanonico(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') {
    return JSON.stringify(valor);
  }
  if (Array.isArray(valor)) {
    return `[${valor.map(serializarCanonico).join(',')}]`;
  }
  const objeto = valor as Record<string, unknown>;
  const chaves = Object.keys(objeto)
    .filter((k) => objeto[k] !== undefined)
    .sort();
  return `{${chaves.map((k) => `${JSON.stringify(k)}:${serializarCanonico(objeto[k])}`).join(',')}}`;
}

export interface ParDeChaves {
  chavePrivada: crypto.KeyObject;
  /** Chave pública Ed25519 em DER/SPKI codificada em base64 — é o "endereço" do validador. */
  chavePublica: string;
}

export function gerarParDeChaves(): ParDeChaves {
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  return carregarParDeChaves(privateKey);
}

export function carregarParDeChaves(chavePrivada: crypto.KeyObject | string): ParDeChaves {
  const privada =
    typeof chavePrivada === 'string' ? crypto.createPrivateKey(chavePrivada) : chavePrivada;
  const publica = crypto
    .createPublicKey(privada)
    .export({ type: 'spki', format: 'der' })
    .toString('base64');
  return { chavePrivada: privada, chavePublica: publica };
}

export function exportarChavePrivadaPem(chavePrivada: crypto.KeyObject): string {
  return chavePrivada.export({ type: 'pkcs8', format: 'pem' }).toString();
}

export function assinar(mensagem: string, chavePrivada: crypto.KeyObject): string {
  return crypto.sign(null, Buffer.from(mensagem), chavePrivada).toString('base64');
}

export function verificarAssinatura(
  mensagem: string,
  assinatura: string,
  chavePublicaBase64: string,
): boolean {
  try {
    const chavePublica = crypto.createPublicKey({
      key: Buffer.from(chavePublicaBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });
    return crypto.verify(null, Buffer.from(mensagem), chavePublica, Buffer.from(assinatura, 'base64'));
  } catch {
    return false;
  }
}
