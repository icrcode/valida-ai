import { buscar, type ProblemaBusca } from '../../../src/pesquisa/astar';
import { verificarConformidade, type Rotulo } from '../../../src/pesquisa/conformidade';
import {
  lerPolitica,
  planejarEndosso,
  satisfaz,
  orgsDaPolitica,
  custoPeer,
  type Peer,
} from '../../../src/pesquisa/endosso';

// ───────────────────────── A* genérico ─────────────────────────

/** Grade 2D com obstáculos: problema clássico para validar o motor. */
function grade(mapa: string[]): ProblemaBusca<[number, number], string> {
  const alvo: [number, number] = [mapa.length - 1, mapa[0].length - 1];
  return {
    inicial: [0, 0],
    ehObjetivo: ([l, c]) => l === alvo[0] && c === alvo[1],
    chave: ([l, c]) => `${l},${c}`,
    heuristica: ([l, c]) => Math.abs(alvo[0] - l) + Math.abs(alvo[1] - c),
    sucessores: ([l, c]) =>
      (
        [
          [l + 1, c, 'S'],
          [l - 1, c, 'N'],
          [l, c + 1, 'L'],
          [l, c - 1, 'O'],
        ] as [number, number, string][]
      )
        .filter(([a, b]) => a >= 0 && b >= 0 && a < mapa.length && b < mapa[0].length && mapa[a][b] !== '#')
        .map(([a, b, acao]) => ({ estado: [a, b] as [number, number], acao, custo: 1 })),
  };
}

describe('A* genérico', () => {
  const mapa = ['....#.....', '.##.#.###.', '.#..#...#.', '.#.###.#..', '...#...#.#', '.#...#....'];

  it('encontra o caminho ótimo e expande menos nós que Dijkstra', () => {
    const a = buscar(grade(mapa));
    const d = buscar(grade(mapa), { estrategia: 'dijkstra' });
    expect(a.encontrado).toBe(true);
    expect(a.custo).toBe(d.custo);
    expect(a.custo).toBe(16);
    expect(a.metricas.nosExpandidos).toBeLessThanOrEqual(d.metricas.nosExpandidos);
  });

  it('Weighted A* respeita a cota custo ≤ w · ótimo', () => {
    const w = buscar(grade(mapa), { estrategia: 'weighted', peso: 3 });
    expect(w.custo).toBeLessThanOrEqual(3 * 16);
  });

  it('informa quando não há solução', () => {
    expect(buscar(grade(['.#', '#.'])).encontrado).toBe(false);
  });
});

// ───────────────────────── Problema 1: conformidade ─────────────────────────

describe('verificarConformidade (alinhamento ótimo)', () => {
  it('traço feliz é conforme com custo 0', () => {
    const r = verificarConformidade(['DOCUMENTO_SUBMETIDO', 'DOCUMENTO_APROVADO', 'CERTIFICADO_EMITIDO']);
    expect(r.conforme).toBe(true);
    expect(r.custo).toBe(0);
    expect(r.aptidao).toBe(1);
  });

  it('aceita ciclos de revisão', () => {
    const r = verificarConformidade([
      'DOCUMENTO_SUBMETIDO',
      'REVISAO_SOLICITADA',
      'REVISAO_SOLICITADA',
      'DOCUMENTO_REPROVADO',
    ]);
    expect(r.conforme).toBe(true);
  });

  it('detecta certificado emitido sem aprovação (custo 1)', () => {
    const r = verificarConformidade(['DOCUMENTO_SUBMETIDO', 'CERTIFICADO_EMITIDO']);
    expect(r.custo).toBe(1);
    expect(r.anomalias).toEqual(['aprovação esperada no estado PENDENTE não foi registrada']);
  });

  it('detecta aprovação duplicada', () => {
    const r = verificarConformidade([
      'DOCUMENTO_SUBMETIDO',
      'DOCUMENTO_APROVADO',
      'DOCUMENTO_APROVADO',
      'CERTIFICADO_EMITIDO',
    ]);
    expect(r.custo).toBe(1);
    expect(r.anomalias[0]).toContain('não é permitido');
  });

  it('modo prefixo aceita documento em andamento; modo completo aponta o que falta', () => {
    const traco: Rotulo[] = ['DOCUMENTO_SUBMETIDO', 'DOCUMENTO_APROVADO'];
    expect(verificarConformidade(traco, { modo: 'prefixo' }).conforme).toBe(true);
    const completo = verificarConformidade(traco, { modo: 'completo' });
    expect(completo.custo).toBe(1);
    expect(completo.anomalias[0]).toContain('emissão de certificado');
  });

  it('A* e Dijkstra encontram o mesmo custo ótimo em traços ruidosos', () => {
    const rotulos: Rotulo[] = [
      'DOCUMENTO_SUBMETIDO',
      'DOCUMENTO_APROVADO',
      'DOCUMENTO_REPROVADO',
      'REVISAO_SOLICITADA',
      'DOCUMENTO_CANCELADO',
      'CERTIFICADO_EMITIDO',
    ];
    let semente = 7;
    const aleatorio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    for (let t = 0; t < 60; t++) {
      const traco = Array.from({ length: 1 + Math.floor(aleatorio() * 9) }, () => rotulos[Math.floor(aleatorio() * rotulos.length)]);
      const a = verificarConformidade(traco);
      const d = verificarConformidade(traco, { estrategia: 'dijkstra' });
      expect(a.custo).toBe(d.custo);
      expect(a.metricas.nosExpandidos).toBeLessThanOrEqual(d.metricas.nosExpandidos);
    }
  });
});

// ───────────────────────── Problema 2: endosso ─────────────────────────

describe('política de endosso', () => {
  it('lê a sintaxe do Fabric', () => {
    const p = lerPolitica("AND('Org1MSP.peer', OutOf(2, 'Org2MSP.peer', 'Org3MSP.member', 'Org4MSP.peer'))");
    expect([...orgsDaPolitica(p)].sort()).toEqual(['Org1MSP', 'Org2MSP', 'Org3MSP', 'Org4MSP']);
    expect(satisfaz(p, new Set(['Org1MSP', 'Org2MSP', 'Org4MSP']))).toBe(true);
    expect(satisfaz(p, new Set(['Org1MSP', 'Org2MSP']))).toBe(false);
  });

  it('rejeita sintaxe inválida', () => {
    expect(() => lerPolitica("AND('Org1MSP.peer'")).toThrow();
  });
});

describe('planejarEndosso', () => {
  const peers: Peer[] = [
    { id: 'p0.org1', org: 'Org1MSP', latenciaMs: 10, alturaBloco: 100, fila: 0 },
    { id: 'p1.org1', org: 'Org1MSP', latenciaMs: 5, alturaBloco: 100, fila: 0 },
    { id: 'p0.org2', org: 'Org2MSP', latenciaMs: 80, alturaBloco: 100, fila: 0 },
    { id: 'p0.org3', org: 'Org3MSP', latenciaMs: 30, alturaBloco: 100, fila: 0 },
    { id: 'p0.org4', org: 'Org4MSP', latenciaMs: 20, alturaBloco: 90, fila: 0 }, // atrasado demais
  ];

  it('escolhe o peer mais barato de cada org e a combinação ótima', () => {
    const plano = planejarEndosso("AND('Org1MSP.peer', OR('Org2MSP.peer', 'Org3MSP.peer'))", peers);
    expect(plano.viavel).toBe(true);
    expect(plano.peers.map((p) => p.id).sort()).toEqual(['p0.org3', 'p1.org1']);
    expect(plano.custo).toBe(35);
  });

  it('descarta peers com ledger muito atrasado', () => {
    const plano = planejarEndosso("OR('Org4MSP.peer', 'Org2MSP.peer')", peers);
    expect(plano.peers.map((p) => p.id)).toEqual(['p0.org2']);
  });

  it('retorna inviável quando a política não pode ser satisfeita', () => {
    expect(planejarEndosso("AND('Org1MSP.peer', 'Org9MSP.peer')", peers).viavel).toBe(false);
  });

  it('custo do peer inclui atraso de altura e fila', () => {
    expect(custoPeer({ id: 'x', org: 'O', latenciaMs: 10, alturaBloco: 98, fila: 2 }, 100)).toBe(10 + 2 * 15 + 2 * 4);
  });

  it('coincide com força bruta em instâncias de hitting set aleatórias', () => {
    let semente = 42;
    const aleatorio = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    for (let t = 0; t < 30; t++) {
      const nOrgs = 7;
      const orgs = Array.from({ length: nOrgs }, (_, i) => `Org${i}MSP`);
      const rede: Peer[] = orgs.map((org, i) => ({
        id: `p${i}`,
        org,
        latenciaMs: 1 + Math.floor(aleatorio() * 100),
        alturaBloco: 100,
        fila: 0,
      }));
      const clausulas = Array.from({ length: 4 }, () => {
        const membros = orgs.filter(() => aleatorio() < 0.35);
        return membros.length > 0 ? membros : [orgs[0]];
      });
      const texto = `AND(${clausulas.map((c) => `OR(${c.map((o) => `'${o}.peer'`).join(',')})`).join(',')})`;
      const politica = lerPolitica(texto);

      let otimo = Number.POSITIVE_INFINITY;
      for (let mask = 0; mask < 1 << nOrgs; mask++) {
        const s = new Set(orgs.filter((_, i) => mask & (1 << i)));
        if (satisfaz(politica, s)) {
          otimo = Math.min(otimo, rede.filter((p) => s.has(p.org)).reduce((a, p) => a + p.latenciaMs, 0));
        }
      }

      const astar = planejarEndosso(politica, rede);
      const dijkstra = planejarEndosso(politica, rede, { estrategia: 'dijkstra' });
      expect(astar.custo).toBe(otimo);
      expect(dijkstra.custo).toBe(otimo);
      expect(astar.metricas.nosExpandidos).toBeLessThanOrEqual(dijkstra.metricas.nosExpandidos);
    }
  });
});
