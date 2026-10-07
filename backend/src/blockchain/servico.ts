import fs from 'node:fs';
import path from 'node:path';
import registrador from '../utils/registrador';
import {
  criarBlocoGenese,
  minerarBloco,
  obterValidadoresAutorizados,
  validarCadeia,
  type Bloco,
  type ResultadoValidacao,
  type Transacao,
} from './cadeia';
import {
  carregarParDeChaves,
  exportarChavePrivadaPem,
  gerarParDeChaves,
  type ParDeChaves,
} from './criptografia';
import { gerarProvaMerkle, verificarProvaMerkle, type PassoProvaMerkle } from './merkle';
import * as repositorio from './repositorio';
import { lerConfigFabric } from './fabric/cliente';
import { enfileirarBloco } from './fabric/outbox';
import { acionarSincronizador, iniciarSincronizador } from './fabric/sincronizador';

/**
 * Serviço que conecta o núcleo da blockchain ao banco e ao restante da aplicação.
 *
 * Fluxo: eventos de documento → registrarTransacao() → fila → mineração (PoW + assinatura)
 *        → bloco persistido de forma atômica sob advisory lock no PostgreSQL.
 */

const MAX_TRANSACOES_POR_BLOCO = 50;

function lerDificuldade(): number {
  const valor = Number.parseInt(process.env.BLOCKCHAIN_DIFICULDADE || '3', 10);
  if (Number.isNaN(valor)) return 3;
  return Math.min(Math.max(valor, 1), 6);
}

function lerValidadoresConfiaveis(): string[] {
  return (process.env.BLOCKCHAIN_VALIDADORES_CONFIAVEIS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

let validadorCache: ParDeChaves | null = null;

/**
 * Carrega a chave Ed25519 do validador deste nó.
 * Prioridade: BLOCKCHAIN_CHAVE_PRIVADA (PEM) → arquivo BLOCKCHAIN_ARQUIVO_CHAVE → gera uma nova e salva.
 */
export function obterValidador(): ParDeChaves {
  if (validadorCache) return validadorCache;

  const pemEnv = process.env.BLOCKCHAIN_CHAVE_PRIVADA;
  if (pemEnv) {
    validadorCache = carregarParDeChaves(pemEnv.replace(/\\n/g, '\n'));
    return validadorCache;
  }

  const arquivo = path.resolve(process.env.BLOCKCHAIN_ARQUIVO_CHAVE || '.blockchain/validador.pem');
  if (fs.existsSync(arquivo)) {
    validadorCache = carregarParDeChaves(fs.readFileSync(arquivo, 'utf8'));
    return validadorCache;
  }

  const novo = gerarParDeChaves();
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  fs.writeFileSync(arquivo, exportarChavePrivadaPem(novo.chavePrivada), { mode: 0o600 });
  registrador.warn(
    `[blockchain] nova chave de validador gerada em ${arquivo}. Faça backup — sem ela este nó não consegue mais assinar blocos.`,
  );
  validadorCache = novo;
  return novo;
}

// ───────────────────────── Fila de mineração ─────────────────────────

interface Pendente {
  tx: Transacao;
  resolver: (bloco: Bloco) => void;
  rejeitar: (erro: unknown) => void;
}

const pendentes: Pendente[] = [];
let filaProcessamento: Promise<void> = Promise.resolve();

async function persistirLote(transacoes: Transacao[]): Promise<Bloco> {
  const cliente = await repositorio.obterClienteComBloqueio();
  try {
    const validador = obterValidador();
    const dificuldade = lerDificuldade();

    let ultimo = await repositorio.buscarUltimoBloco(cliente);
    if (!ultimo) {
      ultimo = criarBlocoGenese(validador, dificuldade, lerValidadoresConfiaveis());
      await repositorio.inserirBloco(cliente, ultimo);
      registrador.info(`[blockchain] bloco gênese criado | hash=${ultimo.hash.slice(0, 16)}…`);
    }

    const bloco = minerarBloco({
      altura: ultimo.altura + 1,
      hashAnterior: ultimo.hash,
      transacoes,
      dificuldade,
      validador,
    });
    await repositorio.inserirBloco(cliente, bloco);

    // Outbox: a pendência para o Hyperledger Fabric é gravada na MESMA transação do bloco
    const fabric = lerConfigFabric();
    if (fabric.habilitado) await enfileirarBloco(cliente, bloco, fabric.checkpointACada);

    await cliente.query('COMMIT');
    acionarSincronizador();

    registrador.info(
      `[blockchain] bloco #${bloco.altura} minerado | tx=${transacoes.length} | nonce=${bloco.nonce} | hash=${bloco.hash.slice(0, 16)}…`,
    );
    return bloco;
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    cliente.release();
  }
}

async function minerarPendentes(): Promise<void> {
  if (pendentes.length === 0) return;
  const lote = pendentes.splice(0, MAX_TRANSACOES_POR_BLOCO);
  try {
    const bloco = await persistirLote(lote.map((p) => p.tx));
    lote.forEach((p) => p.resolver(bloco));
  } catch (err) {
    lote.forEach((p) => p.rejeitar(err));
  }
}

/**
 * Enfileira uma transação e resolve com o bloco em que ela foi gravada.
 * Transações que chegam enquanto um bloco está sendo minerado são agrupadas no próximo.
 */
export function registrarTransacao(tx: Transacao): Promise<Bloco> {
  return new Promise((resolver, rejeitar) => {
    pendentes.push({ tx, resolver, rejeitar });
    filaProcessamento = filaProcessamento.then(minerarPendentes);
  });
}

/** Cria o bloco gênese se a cadeia estiver vazia e verifica a integridade na inicialização. */
export async function inicializarBlockchain(): Promise<void> {
  const ultimo = await repositorio.buscarUltimoBloco();
  if (!ultimo) {
    const cliente = await repositorio.obterClienteComBloqueio();
    try {
      if (!(await repositorio.buscarUltimoBloco(cliente))) {
        const genese = criarBlocoGenese(obterValidador(), lerDificuldade(), lerValidadoresConfiaveis());
        await repositorio.inserirBloco(cliente, genese);
        registrador.info(`[blockchain] bloco gênese criado | hash=${genese.hash.slice(0, 16)}…`);
      }
      await cliente.query('COMMIT');
    } catch (err) {
      await cliente.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      cliente.release();
    }
  }

  iniciarSincronizador();

  const resultado = await validarCadeiaCompleta();
  if (resultado.valida) {
    registrador.info(`[blockchain] integridade OK | ${resultado.blocosVerificados} blocos verificados`);
  } else {
    registrador.error(
      `[blockchain] CADEIA ADULTERADA | ${resultado.erros.length} problema(s): ${resultado.erros
        .slice(0, 3)
        .map((e) => `#${e.altura} ${e.motivo}`)
        .join('; ')}`,
    );
  }
}

// ───────────────────────── Consulta e verificação ─────────────────────────

export async function validarCadeiaCompleta(): Promise<ResultadoValidacao> {
  const blocos = await repositorio.listarTodos();
  const resultado = validarCadeia(blocos);

  // Âncora de confiança externa: o gênese precisa autorizar os validadores esperados.
  // Sem isso, um atacante com acesso total ao banco poderia recriar a cadeia inteira com outra chave.
  const confiaveis = lerValidadoresConfiaveis();
  const hashGeneseEsperado = process.env.BLOCKCHAIN_HASH_GENESE;
  if (blocos.length > 0) {
    if (confiaveis.length > 0) {
      const autorizados = obterValidadoresAutorizados(blocos[0]);
      if (!confiaveis.every((c) => autorizados.includes(c))) {
        resultado.erros.push({ altura: 0, motivo: 'gênese não autoriza os validadores confiáveis configurados' });
      }
    }
    if (hashGeneseEsperado && blocos[0].hash !== hashGeneseEsperado) {
      resultado.erros.push({ altura: 0, motivo: 'hash do gênese difere de BLOCKCHAIN_HASH_GENESE' });
    }
    resultado.valida = resultado.erros.length === 0;
  }

  return resultado;
}

export interface ProvaInclusao {
  transacao: Transacao;
  bloco: {
    altura: number;
    hash: string;
    hashAnterior: string;
    raizMerkle: string;
    timestamp: string;
    validador: string;
    assinatura: string;
  };
  provaMerkle: PassoProvaMerkle[];
  /** A prova de Merkle reconstrói a raiz gravada no cabeçalho do bloco. */
  provaValida: boolean;
  confirmacoes: number;
}

async function montarProvas(
  localizacoes: repositorio.LocalizacaoTransacao[],
): Promise<ProvaInclusao[]> {
  if (localizacoes.length === 0) return [];
  const ultimo = await repositorio.buscarUltimoBloco();
  const alturaAtual = ultimo?.altura ?? 0;

  const provas: ProvaInclusao[] = [];
  for (const loc of localizacoes) {
    const bloco = await repositorio.buscarBloco(loc.altura);
    if (!bloco) continue;
    const folhas = bloco.transacoes.map((t) => t.id);
    const provaMerkle = gerarProvaMerkle(folhas, loc.indice);
    provas.push({
      transacao: loc.transacao,
      bloco: {
        altura: bloco.altura,
        hash: bloco.hash,
        hashAnterior: bloco.hashAnterior,
        raizMerkle: bloco.raizMerkle,
        timestamp: bloco.timestamp,
        validador: bloco.validador,
        assinatura: bloco.assinatura,
      },
      provaMerkle,
      provaValida: verificarProvaMerkle(loc.transacao.id, provaMerkle, bloco.raizMerkle),
      confirmacoes: alturaAtual - bloco.altura + 1,
    });
  }
  return provas;
}

export async function historicoDocumento(documentoId: string): Promise<ProvaInclusao[]> {
  return montarProvas(await repositorio.buscarTransacoesPorDocumento(documentoId));
}

export async function provasPorHashArquivo(hashArquivo: string): Promise<ProvaInclusao[]> {
  return montarProvas(await repositorio.buscarTransacoesPorHashArquivo(hashArquivo));
}

export async function provaTransacao(id: string): Promise<ProvaInclusao | null> {
  const [prova] = await montarProvas(await repositorio.buscarTransacaoPorId(id));
  return prova ?? null;
}

export async function obterStatus() {
  const ultimo = await repositorio.buscarUltimoBloco();
  const genese = await repositorio.buscarBloco(0);
  return {
    altura: ultimo?.altura ?? -1,
    ultimoHash: ultimo?.hash ?? null,
    hashGenese: genese?.hash ?? null,
    dificuldade: lerDificuldade(),
    validadorDesteNo: obterValidador().chavePublica,
    validadoresAutorizados: genese ? obterValidadoresAutorizados(genese) : [],
    transacoesPendentes: pendentes.length,
  };
}
