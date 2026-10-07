import { buscar, type OpcoesBusca, type ResultadoBusca } from './astar';

/**
 * PROBLEMA 1 — Auditoria de conformidade do ciclo de vida de documentos com A*.
 *
 * Inspirado no "alignment-based conformance checking" de Process Mining (Adriansyah, 2014;
 * van der Aalst, 2016): dado o traço de eventos de um documento gravado na blockchain e o
 * modelo normativo do processo (autômato abaixo), encontrar o ALINHAMENTO DE CUSTO MÍNIMO.
 *
 * Movimentos possíveis:
 *   - síncrono  (evento do traço = transição do modelo) .......... custo 0
 *   - só-traço  (evento ocorreu mas o modelo não permite) ......... custo 1  → evento indevido
 *   - só-modelo (modelo exigia um evento que não está no traço) ... custo 1  → evento ausente
 *
 * O custo ótimo é a "distância" do traço ao processo correto; os movimentos não síncronos
 * do alinhamento ótimo são a explicação mínima das anomalias (ex.: certificado emitido sem
 * aprovação, aprovação duplicada, evento que não chegou ao Hyperledger Fabric).
 */

export type Rotulo =
  | 'DOCUMENTO_SUBMETIDO'
  | 'DOCUMENTO_APROVADO'
  | 'DOCUMENTO_REPROVADO'
  | 'REVISAO_SOLICITADA'
  | 'DOCUMENTO_CANCELADO'
  | 'CERTIFICADO_EMITIDO';

export type EstadoModelo =
  | 'INICIO'
  | 'PENDENTE'
  | 'EM_REVISAO'
  | 'APROVADO'
  | 'REPROVADO'
  | 'CANCELADO'
  | 'CERTIFICADO';

export interface ModeloProcesso {
  inicial: EstadoModelo;
  finais: EstadoModelo[];
  transicoes: Record<EstadoModelo, Partial<Record<Rotulo, EstadoModelo>>>;
}

/** Modelo normativo do ciclo de vida de um documento no Valida AI. */
export const MODELO_DOCUMENTO: ModeloProcesso = {
  inicial: 'INICIO',
  finais: ['CERTIFICADO', 'REPROVADO', 'CANCELADO'],
  transicoes: {
    INICIO: { DOCUMENTO_SUBMETIDO: 'PENDENTE' },
    PENDENTE: {
      DOCUMENTO_APROVADO: 'APROVADO',
      DOCUMENTO_REPROVADO: 'REPROVADO',
      REVISAO_SOLICITADA: 'EM_REVISAO',
      DOCUMENTO_CANCELADO: 'CANCELADO',
    },
    EM_REVISAO: {
      DOCUMENTO_APROVADO: 'APROVADO',
      DOCUMENTO_REPROVADO: 'REPROVADO',
      REVISAO_SOLICITADA: 'EM_REVISAO',
    },
    APROVADO: { CERTIFICADO_EMITIDO: 'CERTIFICADO' },
    REPROVADO: {},
    CANCELADO: {},
    CERTIFICADO: {},
  },
};

export type TipoMovimento = 'sincrono' | 'so-traco' | 'so-modelo';

export interface Movimento {
  tipo: TipoMovimento;
  rotulo: Rotulo;
  /** Estado do modelo antes do movimento. */
  estadoModelo: EstadoModelo;
  /** Posição do evento no traço (para movimentos síncrono / só-traço). */
  indiceTraco?: number;
}

interface EstadoAlinhamento {
  /** Quantos eventos do traço já foram consumidos. */
  posicao: number;
  modelo: EstadoModelo;
}

export interface OpcoesConformidade extends OpcoesBusca {
  /**
   * 'completo': o processo precisa ter terminado (estado final do modelo).
   * 'prefixo' : documentos em andamento são aceitos — qualquer estado é final.
   */
  modo?: 'completo' | 'prefixo';
  custoSoTraco?: number;
  custoSoModelo?: number;
}

// ─── Pré-computação para a heurística ───

function distanciasAteFinal(modelo: ModeloProcesso, finais: Set<EstadoModelo>): Map<EstadoModelo, number> {
  // BFS reversa a partir dos estados finais (arestas de custo unitário)
  const dist = new Map<EstadoModelo, number>();
  const fila: EstadoModelo[] = [];
  for (const f of finais) {
    dist.set(f, 0);
    fila.push(f);
  }
  while (fila.length > 0) {
    const atual = fila.shift()!;
    for (const [origem, saidas] of Object.entries(modelo.transicoes) as [EstadoModelo, Record<string, EstadoModelo>][]) {
      if (Object.values(saidas).includes(atual) && !dist.has(origem)) {
        dist.set(origem, dist.get(atual)! + 1);
        fila.push(origem);
      }
    }
  }
  return dist;
}

function rotulosAlcancaveis(modelo: ModeloProcesso): Map<EstadoModelo, Set<Rotulo>> {
  const resultado = new Map<EstadoModelo, Set<Rotulo>>();
  for (const origem of Object.keys(modelo.transicoes) as EstadoModelo[]) {
    const rotulos = new Set<Rotulo>();
    const visitados = new Set<EstadoModelo>([origem]);
    const pilha = [origem];
    while (pilha.length > 0) {
      const q = pilha.pop()!;
      for (const [rotulo, destino] of Object.entries(modelo.transicoes[q]) as [Rotulo, EstadoModelo][]) {
        rotulos.add(rotulo);
        if (!visitados.has(destino)) {
          visitados.add(destino);
          pilha.push(destino);
        }
      }
    }
    resultado.set(origem, rotulos);
  }
  return resultado;
}

export interface ResultadoConformidade {
  conforme: boolean;
  /** Custo do alinhamento ótimo = número mínimo de desvios. */
  custo: number;
  /** 1 − custo / (|traço| + passos do modelo); 1 = perfeitamente conforme. */
  aptidao: number;
  alinhamento: Movimento[];
  anomalias: string[];
  metricas: ResultadoBusca<EstadoAlinhamento, Movimento>['metricas'];
}

const DESCRICAO: Record<Rotulo, string> = {
  DOCUMENTO_SUBMETIDO: 'submissão',
  DOCUMENTO_APROVADO: 'aprovação',
  DOCUMENTO_REPROVADO: 'reprovação',
  REVISAO_SOLICITADA: 'pedido de revisão',
  DOCUMENTO_CANCELADO: 'cancelamento',
  CERTIFICADO_EMITIDO: 'emissão de certificado',
};

export function verificarConformidade(
  traco: Rotulo[],
  opcoes: OpcoesConformidade = {},
  modelo: ModeloProcesso = MODELO_DOCUMENTO,
): ResultadoConformidade {
  const modo = opcoes.modo ?? 'completo';
  const custoTraco = opcoes.custoSoTraco ?? 1;
  const custoModelo = opcoes.custoSoModelo ?? 1;
  const todosEstados = Object.keys(modelo.transicoes) as EstadoModelo[];
  const finais = new Set<EstadoModelo>(modo === 'prefixo' ? todosEstados : modelo.finais);

  const dist = distanciasAteFinal(modelo, finais);
  const alcancaveis = rotulosAlcancaveis(modelo);

  // Sufixo: para cada posição, quantos eventos restantes de cada rótulo existem
  const restantesPorRotulo: Map<Rotulo, number>[] = [];
  for (let i = traco.length; i >= 0; i--) {
    const m = new Map(i < traco.length ? restantesPorRotulo[0] : []);
    if (i < traco.length) m.set(traco[i], (m.get(traco[i]) ?? 0) + 1);
    restantesPorRotulo.unshift(m);
  }

  /**
   * Heurística admissível h = max(h1, h2):
   *  h1 = custoModelo · max(0, dist(q) − restantes)
   *       → pelo menos dist(q) passos do modelo faltam; cada evento restante cobre no máximo um.
   *  h2 = custoTraco · #eventos restantes cujo rótulo é inalcançável a partir de q
   *       → esses eventos só podem virar movimentos só-traço.
   * Ambas são cotas inferiores do custo restante, logo o máximo também é (A* ótimo).
   */
  const heuristica = (e: EstadoAlinhamento): number => {
    const restantes = traco.length - e.posicao;
    const d = dist.get(e.modelo) ?? Number.POSITIVE_INFINITY;
    const h1 = custoModelo * Math.max(0, d - restantes);
    let inalcancaveis = 0;
    const alc = alcancaveis.get(e.modelo)!;
    for (const [rotulo, qtd] of restantesPorRotulo[e.posicao]) {
      if (!alc.has(rotulo)) inalcancaveis += qtd;
    }
    return Math.max(h1, custoTraco * inalcancaveis);
  };

  const resultado = buscar<EstadoAlinhamento, Movimento>(
    {
      inicial: { posicao: 0, modelo: modelo.inicial },
      ehObjetivo: (e) => e.posicao === traco.length && finais.has(e.modelo),
      chave: (e) => `${e.posicao}|${e.modelo}`,
      heuristica,
      sucessores: (e) => {
        const lista = [];
        const saidas = modelo.transicoes[e.modelo];
        if (e.posicao < traco.length) {
          const rotulo = traco[e.posicao];
          const destino = saidas[rotulo];
          if (destino) {
            lista.push({
              estado: { posicao: e.posicao + 1, modelo: destino },
              acao: { tipo: 'sincrono' as const, rotulo, estadoModelo: e.modelo, indiceTraco: e.posicao },
              custo: 0,
            });
          }
          lista.push({
            estado: { posicao: e.posicao + 1, modelo: e.modelo },
            acao: { tipo: 'so-traco' as const, rotulo, estadoModelo: e.modelo, indiceTraco: e.posicao },
            custo: custoTraco,
          });
        }
        for (const [rotulo, destino] of Object.entries(saidas) as [Rotulo, EstadoModelo][]) {
          lista.push({
            estado: { posicao: e.posicao, modelo: destino },
            acao: { tipo: 'so-modelo' as const, rotulo, estadoModelo: e.modelo },
            custo: custoModelo,
          });
        }
        return lista;
      },
    },
    opcoes,
  );

  const passosModelo = resultado.acoes.filter((m) => m.tipo !== 'so-traco').length;
  const pior = traco.length * custoTraco + passosModelo * custoModelo;

  return {
    conforme: resultado.encontrado && resultado.custo === 0,
    custo: resultado.custo,
    aptidao: pior === 0 ? 1 : Math.max(0, 1 - resultado.custo / pior),
    alinhamento: resultado.acoes,
    anomalias: resultado.acoes
      .filter((m) => m.tipo !== 'sincrono')
      .map((m) =>
        m.tipo === 'so-traco'
          ? `evento #${(m.indiceTraco ?? 0) + 1} (${DESCRICAO[m.rotulo]}) não é permitido no estado ${m.estadoModelo}`
          : `${DESCRICAO[m.rotulo]} esperada no estado ${m.estadoModelo} não foi registrada`,
      ),
    metricas: resultado.metricas,
  };
}
