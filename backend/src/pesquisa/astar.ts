/**
 * Busca A* genérica (Hart, Nilsson & Raphael, 1968) sobre um espaço de estados implícito.
 *
 * f(n) = g(n) + w · h(n)
 *   - w = 1  → A* clássico (ótimo se h for admissível)
 *   - w = 0  → Dijkstra / custo uniforme (ótimo, sem heurística)
 *   - w > 1  → Weighted A* (Pohl, 1970): mais rápido, custo ≤ w · ótimo
 *   - modo 'guloso' → Greedy Best-First: f = h (rápido, sem garantia de otimalidade)
 *
 * Instrumentado para pesquisa: conta nós expandidos/gerados e o tamanho máximo da fronteira.
 */

export interface Sucessor<E, A> {
  estado: E;
  acao: A;
  custo: number;
}

export interface ProblemaBusca<E, A> {
  inicial: E;
  ehObjetivo(estado: E): boolean;
  sucessores(estado: E): Sucessor<E, A>[];
  heuristica(estado: E): number;
  /** Identidade do estado para a lista fechada (estados iguais → mesma chave). */
  chave(estado: E): string;
}

export type Estrategia = 'astar' | 'dijkstra' | 'weighted' | 'guloso';

export interface OpcoesBusca {
  estrategia?: Estrategia;
  /** Peso da heurística no Weighted A*. */
  peso?: number;
  /** Limite de expansões (proteção contra explosão do espaço de estados). */
  limiteExpansoes?: number;
}

export interface ResultadoBusca<E, A> {
  encontrado: boolean;
  custo: number;
  acoes: A[];
  estados: E[];
  metricas: {
    nosExpandidos: number;
    nosGerados: number;
    fronteiraMaxima: number;
    /** Estados reexpandidos porque um caminho mais barato foi achado depois (heurística inconsistente). */
    reaberturas: number;
    tempoMs: number;
  };
}

interface No<E, A> {
  estado: E;
  g: number;
  f: number;
  h: number;
  pai: No<E, A> | null;
  acao: A | null;
  /** Ordem de inserção: desempate estável. */
  seq: number;
}

/** Heap binário mínimo por f; desempate por maior g (mais perto do objetivo) e depois FIFO. */
class FilaPrioridade<T extends { f: number; g: number; seq: number }> {
  private itens: T[] = [];

  get tamanho(): number {
    return this.itens.length;
  }

  private menor(a: T, b: T): boolean {
    if (a.f !== b.f) return a.f < b.f;
    if (a.g !== b.g) return a.g > b.g;
    return a.seq < b.seq;
  }

  inserir(item: T): void {
    const v = this.itens;
    v.push(item);
    let i = v.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.menor(v[i], v[p])) break;
      [v[i], v[p]] = [v[p], v[i]];
      i = p;
    }
  }

  remover(): T | undefined {
    const v = this.itens;
    if (v.length === 0) return undefined;
    const topo = v[0];
    const ultimo = v.pop()!;
    if (v.length > 0) {
      v[0] = ultimo;
      let i = 0;
      for (;;) {
        const e = 2 * i + 1;
        const d = e + 1;
        let m = i;
        if (e < v.length && this.menor(v[e], v[m])) m = e;
        if (d < v.length && this.menor(v[d], v[m])) m = d;
        if (m === i) break;
        [v[i], v[m]] = [v[m], v[i]];
        i = m;
      }
    }
    return topo;
  }
}

function calcularF(g: number, h: number, estrategia: Estrategia, peso: number): number {
  switch (estrategia) {
    case 'dijkstra':
      return g;
    case 'guloso':
      return h;
    case 'weighted':
      return g + peso * h;
    default:
      return g + h;
  }
}

export function buscar<E, A>(problema: ProblemaBusca<E, A>, opcoes: OpcoesBusca = {}): ResultadoBusca<E, A> {
  const estrategia = opcoes.estrategia ?? 'astar';
  const peso = opcoes.peso ?? 2;
  const limite = opcoes.limiteExpansoes ?? 1_000_000;
  const inicio = performance.now();

  let seq = 0;
  let nosGerados = 1;
  let nosExpandidos = 0;
  let fronteiraMaxima = 1;
  let reaberturas = 0;

  // Sem lista fechada rígida: um estado é reaberto se for alcançado com g menor.
  // Isso preserva a otimalidade com heurísticas apenas admissíveis (não necessariamente consistentes).
  const melhorG = new Map<string, number>();
  const expandidos = new Set<string>();
  const fronteira = new FilaPrioridade<No<E, A>>();

  const h0 = estrategia === 'dijkstra' ? 0 : problema.heuristica(problema.inicial);
  fronteira.inserir({
    estado: problema.inicial,
    g: 0,
    h: h0,
    f: calcularF(0, h0, estrategia, peso),
    pai: null,
    acao: null,
    seq: seq++,
  });
  melhorG.set(problema.chave(problema.inicial), 0);

  const finalizar = (no: No<E, A> | null): ResultadoBusca<E, A> => {
    const acoes: A[] = [];
    const estados: E[] = [];
    for (let n = no; n; n = n.pai) {
      estados.unshift(n.estado);
      if (n.acao !== null) acoes.unshift(n.acao);
    }
    return {
      encontrado: no !== null,
      custo: no ? no.g : Number.POSITIVE_INFINITY,
      acoes,
      estados,
      metricas: { nosExpandidos, nosGerados, fronteiraMaxima, reaberturas, tempoMs: performance.now() - inicio },
    };
  };

  while (fronteira.tamanho > 0) {
    const no = fronteira.remover()!;
    const k = problema.chave(no.estado);
    if (no.g > (melhorG.get(k) ?? Number.POSITIVE_INFINITY)) continue; // entrada obsoleta

    if (problema.ehObjetivo(no.estado)) return finalizar(no);

    if (expandidos.has(k)) reaberturas += 1;
    expandidos.add(k);
    nosExpandidos += 1;
    if (nosExpandidos > limite) break;

    for (const s of problema.sucessores(no.estado)) {
      const ks = problema.chave(s.estado);
      const g = no.g + s.custo;
      if (g >= (melhorG.get(ks) ?? Number.POSITIVE_INFINITY)) continue;
      melhorG.set(ks, g);
      const h = estrategia === 'dijkstra' ? 0 : problema.heuristica(s.estado);
      fronteira.inserir({
        estado: s.estado,
        g,
        h,
        f: calcularF(g, h, estrategia, peso),
        pai: no,
        acao: s.acao,
        seq: seq++,
      });
      nosGerados += 1;
    }
    fronteiraMaxima = Math.max(fronteiraMaxima, fronteira.tamanho);
  }

  return finalizar(null);
}
