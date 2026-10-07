import { buscar, type OpcoesBusca, type ResultadoBusca } from './astar';

/**
 * PROBLEMA 2 — Planejamento de endosso no Hyperledger Fabric com A*.
 *
 * No Fabric (modelo execute-order-validate, Androulaki et al., 2018) uma transação só é válida se
 * for endossada por peers que satisfaçam a POLÍTICA DE ENDOSSO do chaincode, ex.:
 *   AND('Org1MSP.peer', OR('Org2MSP.peer', 'Org3MSP.peer'))
 *   OutOf(2, 'Org1MSP.peer', 'Org2MSP.peer', 'Org3MSP.peer')
 *
 * Cada peer tem um custo (latência + atraso de altura do ledger + fila de propostas). Problema:
 * escolher o conjunto de organizações (e o peer de cada uma) que satisfaz a política com CUSTO
 * TOTAL MÍNIMO. Com políticas AND de ORs ele generaliza o "hitting set" ponderado, portanto é
 * NP-difícil — uma busca informada (A*) com heurística admissível encontra o ótimo expandindo
 * muito menos estados que a busca cega.
 */

// ───────────────────────── Política de endosso ─────────────────────────

export type Politica =
  | { tipo: 'org'; org: string }
  | { tipo: 'and'; filhos: Politica[] }
  | { tipo: 'or'; filhos: Politica[] }
  | { tipo: 'outof'; k: number; filhos: Politica[] };

/**
 * Lê a sintaxe de política do Fabric: AND(...), OR(...), OutOf(k, ...), 'OrgMSP.peer'.
 */
export function lerPolitica(texto: string): Politica {
  let i = 0;
  const espacos = () => {
    while (i < texto.length && /\s/.test(texto[i])) i++;
  };
  const esperar = (c: string) => {
    espacos();
    if (texto[i] !== c) throw new Error(`Política inválida: esperado "${c}" na posição ${i}`);
    i++;
  };

  const expressao = (): Politica => {
    espacos();
    if (texto[i] === "'" || texto[i] === '"') {
      const aspas = texto[i++];
      const fim = texto.indexOf(aspas, i);
      if (fim < 0) throw new Error('Política inválida: aspas não fechadas');
      const principal = texto.slice(i, fim);
      i = fim + 1;
      return { tipo: 'org', org: principal.split('.')[0] };
    }
    const m = /^(AND|OR|OutOf)\s*\(/i.exec(texto.slice(i));
    if (!m) throw new Error(`Política inválida na posição ${i}`);
    i += m[0].length;
    const operador = m[1].toLowerCase();
    let k = 0;
    if (operador === 'outof') {
      espacos();
      const num = /^\d+/.exec(texto.slice(i));
      if (!num) throw new Error('OutOf exige um número');
      k = Number.parseInt(num[0], 10);
      i += num[0].length;
      esperar(',');
    }
    const filhos: Politica[] = [expressao()];
    espacos();
    while (texto[i] === ',') {
      i++;
      filhos.push(expressao());
      espacos();
    }
    esperar(')');
    if (operador === 'and') return { tipo: 'and', filhos };
    if (operador === 'or') return { tipo: 'or', filhos };
    return { tipo: 'outof', k, filhos };
  };

  const resultado = expressao();
  espacos();
  if (i !== texto.length) throw new Error('Política inválida: texto excedente');
  return resultado;
}

export function orgsDaPolitica(p: Politica): Set<string> {
  if (p.tipo === 'org') return new Set([p.org]);
  const s = new Set<string>();
  for (const f of p.filhos) for (const o of orgsDaPolitica(f)) s.add(o);
  return s;
}

export function satisfaz(p: Politica, orgs: Set<string>): boolean {
  switch (p.tipo) {
    case 'org':
      return orgs.has(p.org);
    case 'and':
      return p.filhos.every((f) => satisfaz(f, orgs));
    case 'or':
      return p.filhos.some((f) => satisfaz(f, orgs));
    case 'outof':
      return p.filhos.filter((f) => satisfaz(f, orgs)).length >= p.k;
  }
}

// ───────────────────────── Rede e custos ─────────────────────────

export interface Peer {
  id: string;
  org: string;
  latenciaMs: number;
  alturaBloco: number;
  /** Propostas aguardando no peer. */
  fila: number;
  disponivel?: boolean;
}

export interface PesosCusto {
  /** ms equivalentes por bloco de atraso em relação ao peer mais atualizado. */
  porBlocoAtrasado: number;
  /** ms equivalentes por proposta na fila. */
  porItemNaFila: number;
  /** Peers mais atrasados que isso são descartados (ledger desatualizado gera MVCC_READ_CONFLICT). */
  atrasoMaximo: number;
}

export const PESOS_PADRAO: PesosCusto = { porBlocoAtrasado: 15, porItemNaFila: 4, atrasoMaximo: 5 };

export function custoPeer(peer: Peer, alturaMax: number, pesos: PesosCusto = PESOS_PADRAO): number {
  return peer.latenciaMs + (alturaMax - peer.alturaBloco) * pesos.porBlocoAtrasado + peer.fila * pesos.porItemNaFila;
}

// ───────────────────────── Busca ─────────────────────────

export interface PlanoEndosso {
  viavel: boolean;
  custo: number;
  peers: Peer[];
  metricas: ResultadoBusca<number, string>['metricas'];
}

/**
 * Cota inferior admissível do custo que falta para satisfazer `p`, dadas as orgs já escolhidas.
 *  - org     → 0 se já escolhida, senão o custo do melhor peer dela
 *  - OR      → mínimo dos filhos
 *  - AND     → soma dos filhos se os conjuntos de orgs forem disjuntos; senão o máximo
 *  - OutOf k → soma dos k menores se disjuntos; senão o k-ésimo menor
 * (Com orgs compartilhadas, somar contaria a mesma org duas vezes e superestimaria o custo.)
 */
function criarHeuristica(politica: Politica, custoOrg: Map<string, number>) {
  const disjuntos = new Map<Politica, boolean>();
  const marcar = (p: Politica): Set<string> => {
    if (p.tipo === 'org') return new Set([p.org]);
    const conjuntos = p.filhos.map(marcar);
    const uniao = new Set<string>();
    let total = 0;
    for (const c of conjuntos) {
      total += c.size;
      for (const o of c) uniao.add(o);
    }
    disjuntos.set(p, uniao.size === total);
    return uniao;
  };
  marcar(politica);

  const h = (p: Politica, escolhidas: Set<string>): number => {
    switch (p.tipo) {
      case 'org':
        return escolhidas.has(p.org) ? 0 : custoOrg.get(p.org) ?? Number.POSITIVE_INFINITY;
      case 'or':
        return Math.min(...p.filhos.map((f) => h(f, escolhidas)));
      case 'and': {
        const v = p.filhos.map((f) => h(f, escolhidas));
        return disjuntos.get(p) ? v.reduce((a, b) => a + b, 0) : Math.max(...v);
      }
      case 'outof': {
        if (p.k <= 0) return 0;
        const v = p.filhos.map((f) => h(f, escolhidas)).sort((a, b) => a - b);
        if (v.length < p.k) return Number.POSITIVE_INFINITY;
        return disjuntos.get(p) ? v.slice(0, p.k).reduce((a, b) => a + b, 0) : v[p.k - 1];
      }
    }
  };
  return h;
}

export function planejarEndosso(
  politica: Politica | string,
  peers: Peer[],
  opcoes: OpcoesBusca & { pesos?: PesosCusto } = {},
): PlanoEndosso {
  const p = typeof politica === 'string' ? lerPolitica(politica) : politica;
  const pesos = opcoes.pesos ?? PESOS_PADRAO;

  const ativos = peers.filter((x) => x.disponivel !== false);
  const alturaMax = Math.max(0, ...ativos.map((x) => x.alturaBloco));
  const elegiveis = ativos.filter((x) => alturaMax - x.alturaBloco <= pesos.atrasoMaximo);

  // Melhor peer de cada organização relevante para a política
  const melhorPeer = new Map<string, { peer: Peer; custo: number }>();
  for (const peer of elegiveis) {
    const c = custoPeer(peer, alturaMax, pesos);
    const atual = melhorPeer.get(peer.org);
    if (!atual || c < atual.custo) melhorPeer.set(peer.org, { peer, custo: c });
  }
  const orgs = [...orgsDaPolitica(p)].filter((o) => melhorPeer.has(o)).sort();
  const custoOrg = new Map(orgs.map((o) => [o, melhorPeer.get(o)!.custo]));
  const h = criarHeuristica(p, custoOrg);

  // Estado = bitmask das orgs escolhidas. Só acrescentamos orgs com índice maior que o maior já
  // escolhido: cada subconjunto é gerado uma única vez (quebra de simetria sem perder completude).
  const conjunto = (mask: number) => new Set(orgs.filter((_, i) => mask & (1 << i)));
  const maiorIndice = (mask: number) => (mask === 0 ? -1 : 31 - Math.clz32(mask));

  const resultado = buscar<number, string>(
    {
      inicial: 0,
      chave: (mask) => String(mask),
      ehObjetivo: (mask) => satisfaz(p, conjunto(mask)),
      heuristica: (mask) => h(p, conjunto(mask)),
      sucessores: (mask) => {
        const lista = [];
        for (let i = maiorIndice(mask) + 1; i < orgs.length; i++) {
          lista.push({ estado: mask | (1 << i), acao: orgs[i], custo: custoOrg.get(orgs[i])! });
        }
        return lista;
      },
    },
    opcoes,
  );

  return {
    viavel: resultado.encontrado,
    custo: resultado.custo,
    peers: resultado.acoes.map((o) => melhorPeer.get(o)!.peer),
    metricas: resultado.metricas,
  };
}
