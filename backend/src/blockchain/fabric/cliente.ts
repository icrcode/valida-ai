import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type * as grpcTipos from '@grpc/grpc-js';
import type { Contract, Gateway } from '@hyperledger/fabric-gateway';
import registrador from '../../utils/registrador';

/**
 * Cliente do Hyperledger Fabric via Fabric Gateway (Fabric ≥ 2.4).
 * Configurado por variáveis FABRIC_* (gere com `fabric/rede/rede.sh env`).
 */

export interface ConfigFabric {
  habilitado: boolean;
  canal: string;
  chaincode: string;
  mspId: string;
  endpoint: string;
  aliasHost: string;
  certTls: string;
  certIdentidade: string;
  chavePrivada: string;
  intervaloSincronizacaoMs: number;
  checkpointACada: number;
}

export function lerConfigFabric(): ConfigFabric {
  return {
    habilitado: process.env.FABRIC_HABILITADO === 'true',
    canal: process.env.FABRIC_CANAL || 'valida',
    chaincode: process.env.FABRIC_CHAINCODE || 'valida-documentos',
    mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
    endpoint: process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051',
    aliasHost: process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.example.com',
    certTls: process.env.FABRIC_TLS_CERT_PATH || '',
    certIdentidade: process.env.FABRIC_CERT_PATH || '',
    chavePrivada: process.env.FABRIC_KEY_PATH || '',
    intervaloSincronizacaoMs: Number.parseInt(process.env.FABRIC_INTERVALO_SINCRONIZACAO_MS || '5000', 10),
    checkpointACada: Math.max(1, Number.parseInt(process.env.FABRIC_CHECKPOINT_A_CADA || '10', 10)),
  };
}

/** Aceita caminho de arquivo ou de diretório (pega o primeiro arquivo — layout do MSP do Fabric). */
function lerArquivoOuPrimeiroDoDiretorio(caminho: string): Buffer {
  if (fs.statSync(caminho).isDirectory()) {
    const [primeiro] = fs.readdirSync(caminho);
    if (!primeiro) throw new Error(`Diretório vazio: ${caminho}`);
    return fs.readFileSync(path.join(caminho, primeiro));
  }
  return fs.readFileSync(caminho);
}

let conexao: { cliente: grpcTipos.Client; gateway: Gateway; contrato: Contract } | null = null;

/**
 * As bibliotecas do Fabric só são carregadas quando o Fabric está habilitado: quem roda o
 * projeto sem a rede não paga o custo (nem precisa das dependências nativas do gRPC).
 */
async function carregarBibliotecas() {
  const [grpc, gateway] = await Promise.all([import('@grpc/grpc-js'), import('@hyperledger/fabric-gateway')]);
  return { grpc, ...gateway };
}

export async function obterContrato(): Promise<Contract> {
  if (conexao) return conexao.contrato;
  const cfg = lerConfigFabric();
  if (!cfg.habilitado) throw new Error('Hyperledger Fabric desabilitado (FABRIC_HABILITADO=false)');
  const { grpc, connect, hash, signers } = await carregarBibliotecas();

  const credenciais = grpc.credentials.createSsl(fs.readFileSync(cfg.certTls));
  const cliente = new grpc.Client(cfg.endpoint, credenciais, {
    'grpc.ssl_target_name_override': cfg.aliasHost,
  });

  const gateway = connect({
    client: cliente,
    identity: { mspId: cfg.mspId, credentials: lerArquivoOuPrimeiroDoDiretorio(cfg.certIdentidade) },
    signer: signers.newPrivateKeySigner(crypto.createPrivateKey(lerArquivoOuPrimeiroDoDiretorio(cfg.chavePrivada))),
    hash: hash.sha256,
    evaluateOptions: () => ({ deadline: Date.now() + 5_000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15_000 }),
    submitOptions: () => ({ deadline: Date.now() + 5_000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 60_000 }),
  });

  const contrato = gateway.getNetwork(cfg.canal).getContract(cfg.chaincode);
  conexao = { cliente, gateway, contrato };
  registrador.info(`[fabric] conectado a ${cfg.endpoint} | canal=${cfg.canal} | chaincode=${cfg.chaincode}`);
  return contrato;
}

export function desconectar(): void {
  conexao?.gateway.close();
  conexao?.cliente.close();
  conexao = null;
}

const decodificador = new TextDecoder();

/**
 * Extrai a mensagem do chaincode de um erro do Gateway (EndorseError/GatewayError trazem
 * a mensagem original em `details[].message`).
 */
export function mensagemErroFabric(err: unknown): string {
  const detalhes = (err as { details?: { message?: string }[] }).details;
  const doChaincode = detalhes?.map((d) => d.message).find(Boolean);
  if (doChaincode) return doChaincode;
  return err instanceof Error ? err.message : String(err);
}

/** Envia uma transação, espera o commit e devolve o id da transação no Fabric. */
export async function submeter(funcao: string, ...args: string[]): Promise<{ txId: string; resultado: string }> {
  const contrato = await obterContrato();
  const enviada = await contrato.submitAsync(funcao, { arguments: args });
  const status = await enviada.getStatus();
  if (!status.successful) {
    throw new Error(`COMMIT_FALHOU: transação ${status.transactionId} com código ${status.code}`);
  }
  return { txId: status.transactionId, resultado: decodificador.decode(enviada.getResult()) };
}

export async function consultar<T>(funcao: string, ...args: string[]): Promise<T> {
  const bytes = await (await obterContrato()).evaluateTransaction(funcao, ...args);
  return JSON.parse(decodificador.decode(bytes)) as T;
}
