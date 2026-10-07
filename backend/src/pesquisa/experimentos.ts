/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import type { Estrategia } from './astar';
import { MODELO_DOCUMENTO, verificarConformidade, type EstadoModelo, type Rotulo } from './conformidade';
import { lerPolitica, planejarEndosso, type Peer } from './endosso';

/**
 * Experimentos da pesquisa (reprodutíveis: gerador pseudoaleatório com semente fixa).
 *
 *   npm run pesquisa:experimentos            → imprime as tabelas
 *   npm run pesquisa:experimentos -- --csv   → também grava CSVs em docs/pesquisa/resultados
 *
 * E1: conformidade — A* vs Dijkstra vs Weighted A* vs Guloso, variando tamanho do traço e ruído.
 * E2: endosso      — mesmas estratégias, variando o número de organizações da rede Fabric.
 */

function criarAleatorio(semente: number) {
  let s = semente % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

type Aleatorio = ReturnType<typeof criarAleatorio>;

const ESTRATEGIAS: { nome: string; estrategia: Estrategia; peso?: number }[] = [
  { nome: 'Dijkstra', estrategia: 'dijkstra' },
  { nome: 'A*', estrategia: 'astar' },
  { nome: 'Weighted A* (w=2)', estrategia: 'weighted', peso: 2 },
  { nome: 'Guloso', estrategia: 'guloso' },
];

const LIMITE_EXPANSOES = 300_000;

interface Linha {
  [coluna: string]: string | number;
}

function media(v: number[]): number {
  return v.length === 0 ? 0 : v.reduce((a, b) => a + b, 0) / v.length;
}

function imprimirTabela(titulo: string, linhas: Linha[]): void {
  console.log(`\n### ${titulo}\n`);
  const colunas = Object.keys(linhas[0]);
  console.log(`| ${colunas.join(' | ')} |`);
  console.log(`| ${colunas.map(() => '---').join(' | ')} |`);
  for (const l of linhas) console.log(`| ${colunas.map((c) => l[c]).join(' | ')} |`);
}

function gravarCsv(nome: string, linhas: Linha[]): void {
  const dir = path.resolve(__dirname, '../../../docs/pesquisa/resultados');
  fs.mkdirSync(dir, { recursive: true });
  const colunas = Object.keys(linhas[0]);
  const csv = [colunas.join(','), ...linhas.map((l) => colunas.map((c) => l[c]).join(','))].join('\n');
  fs.writeFileSync(path.join(dir, `${nome}.csv`), `${csv}\n`);
}

// ───────────────────────── E1: conformidade ─────────────────────────

/** Passeio aleatório no modelo até um estado final, com laços de revisão para alongar o traço. */
function gerarTracoValido(tamanhoAlvo: number, rnd: Aleatorio): Rotulo[] {
  const traco: Rotulo[] = [];
  let q: EstadoModelo = MODELO_DOCUMENTO.inicial;
  while (!MODELO_DOCUMENTO.finais.includes(q)) {
    const opcoes = Object.entries(MODELO_DOCUMENTO.transicoes[q]) as [Rotulo, EstadoModelo][];
    // Enquanto o traço for curto, favorece o laço de revisão
    const laco = opcoes.find(([r]) => r === 'REVISAO_SOLICITADA');
    const [rotulo, destino] =
      laco && traco.length < tamanhoAlvo - 2 && rnd() < 0.85 ? laco : opcoes[Math.floor(rnd() * opcoes.length)];
    traco.push(rotulo);
    q = destino;
  }
  return traco;
}

const ROTULOS: Rotulo[] = Object.keys(MODELO_DOCUMENTO.transicoes.PENDENTE).concat([
  'DOCUMENTO_SUBMETIDO',
  'CERTIFICADO_EMITIDO',
]) as Rotulo[];

/** Ruído: cada evento pode ser removido, duplicado ou trocado por outro rótulo. */
function aplicarRuido(traco: Rotulo[], taxa: number, rnd: Aleatorio): Rotulo[] {
  const saida: Rotulo[] = [];
  for (const e of traco) {
    if (rnd() >= taxa) {
      saida.push(e);
      continue;
    }
    const tipo = rnd();
    if (tipo < 1 / 3) continue; // remoção (ex.: evento não sincronizado com o Fabric)
    if (tipo < 2 / 3) saida.push(e, e); // duplicação (ex.: reenvio)
    else saida.push(ROTULOS[Math.floor(rnd() * ROTULOS.length)]); // troca
  }
  return saida;
}

function experimentoConformidade(): Linha[] {
  const rnd = criarAleatorio(2026);
  const linhas: Linha[] = [];
  const AMOSTRAS = 40;

  for (const tamanho of [5, 10, 20, 40, 80]) {
    for (const ruido of [0, 0.1, 0.3]) {
      const tracos = Array.from({ length: AMOSTRAS }, () => aplicarRuido(gerarTracoValido(tamanho, rnd), ruido, rnd));
      const otimos = tracos.map((t) => verificarConformidade(t, { estrategia: 'astar' }).custo);

      for (const e of ESTRATEGIAS) {
        const r = tracos.map((t) =>
          verificarConformidade(t, { estrategia: e.estrategia, peso: e.peso, limiteExpansoes: LIMITE_EXPANSOES }),
        );
        const otimas = r.filter((x, i) => x.custo === otimos[i]).length;
        linhas.push({
          tamanho,
          tamanho_real: media(tracos.map((t) => t.length)).toFixed(1),
          ruido,
          estrategia: e.nome,
          expandidos: media(r.map((x) => x.metricas.nosExpandidos)).toFixed(1),
          gerados: media(r.map((x) => x.metricas.nosGerados)).toFixed(1),
          tempo_ms: media(r.map((x) => x.metricas.tempoMs)).toFixed(3),
          custo_medio: media(r.map((x) => x.custo)).toFixed(2),
          pct_otimo: ((100 * otimas) / AMOSTRAS).toFixed(0),
        });
      }
    }
  }
  return linhas;
}

// ───────────────────────── E2: endosso ─────────────────────────

function gerarRede(nOrgs: number, rnd: Aleatorio): Peer[] {
  const peers: Peer[] = [];
  for (let o = 0; o < nOrgs; o++) {
    const peersPorOrg = 1 + Math.floor(rnd() * 3);
    for (let p = 0; p < peersPorOrg; p++) {
      peers.push({
        id: `peer${p}.org${o}`,
        org: `Org${o}MSP`,
        latenciaMs: 5 + Math.floor(rnd() * 120),
        alturaBloco: 1000 - Math.floor(rnd() * 4),
        fila: Math.floor(rnd() * 10),
      });
    }
  }
  return peers;
}

/** AND de cláusulas OR (hitting set ponderado), com uma cláusula OutOf para variar a estrutura. */
function gerarPolitica(nOrgs: number, rnd: Aleatorio): string {
  const orgs = Array.from({ length: nOrgs }, (_, i) => `'Org${i}MSP.peer'`);
  const sortear = (prob: number) => {
    const s = orgs.filter(() => rnd() < prob);
    return s.length > 0 ? s : [orgs[Math.floor(rnd() * nOrgs)]];
  };
  const clausulas = Array.from({ length: Math.ceil(nOrgs / 2) }, () => `OR(${sortear(0.25).join(',')})`);
  const k = 2;
  const grupo = sortear(0.3);
  if (grupo.length >= k) clausulas.push(`OutOf(${k},${grupo.join(',')})`);
  return `AND(${clausulas.join(',')})`;
}

function experimentoEndosso(): Linha[] {
  const rnd = criarAleatorio(1968);
  const linhas: Linha[] = [];
  const AMOSTRAS = 25;

  for (const nOrgs of [6, 10, 14, 18, 22]) {
    const instancias = Array.from({ length: AMOSTRAS }, () => ({
      rede: gerarRede(nOrgs, rnd),
      politica: lerPolitica(gerarPolitica(nOrgs, rnd)),
    }));
    const otimos = instancias.map((i) => planejarEndosso(i.politica, i.rede, { limiteExpansoes: LIMITE_EXPANSOES }).custo);

    for (const e of ESTRATEGIAS) {
      const r = instancias.map((i) =>
        planejarEndosso(i.politica, i.rede, { estrategia: e.estrategia, peso: e.peso, limiteExpansoes: LIMITE_EXPANSOES }),
      );
      const resolvidas = r.filter((x) => x.viavel);
      const razao = r
        .map((x, i) => (x.viavel && Number.isFinite(otimos[i]) && otimos[i] > 0 ? x.custo / otimos[i] : null))
        .filter((x): x is number => x !== null);
      linhas.push({
        orgs: nOrgs,
        estrategia: e.nome,
        expandidos: media(r.map((x) => x.metricas.nosExpandidos)).toFixed(1),
        tempo_ms: media(r.map((x) => x.metricas.tempoMs)).toFixed(3),
        resolvidas: `${resolvidas.length}/${AMOSTRAS}`,
        custo_vs_otimo: razao.length ? media(razao).toFixed(3) : '-',
        pior_razao: razao.length ? Math.max(...razao).toFixed(3) : '-',
      });
    }
  }
  return linhas;
}

// ───────────────────────── Execução ─────────────────────────

if (require.main === module) {
  const csv = process.argv.includes('--csv');
  console.log('# Resultados experimentais — A* no Valida AI');

  const e1 = experimentoConformidade();
  imprimirTabela('E1 — Auditoria de conformidade (média de 40 traços por linha)', e1);
  const e2 = experimentoEndosso();
  imprimirTabela('E2 — Planejamento de endosso no Fabric (média de 25 redes por linha)', e2);

  if (csv) {
    gravarCsv('e1-conformidade', e1);
    gravarCsv('e2-endosso', e2);
    console.log('\nCSVs gravados em docs/pesquisa/resultados/');
  }
}

export { experimentoConformidade, experimentoEndosso };
