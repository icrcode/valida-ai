import {
  calcularRaizMerkle,
  gerarProvaMerkle,
  verificarProvaMerkle,
} from '../../../src/blockchain/merkle';
import { sha256 } from '../../../src/blockchain/criptografia';

const folhas = (n: number) => Array.from({ length: n }, (_, i) => sha256(`tx-${i}`));

describe('árvore de Merkle', () => {
  it('raiz de uma folha é a própria folha', () => {
    const [f] = folhas(1);
    expect(calcularRaizMerkle([f])).toBe(f);
  });

  it('raiz de duas folhas é o hash da concatenação', () => {
    const [a, b] = folhas(2);
    expect(calcularRaizMerkle([a, b])).toBe(sha256(a + b));
  });

  it('raiz muda se a ordem das transações mudar', () => {
    const f = folhas(4);
    expect(calcularRaizMerkle(f)).not.toBe(calcularRaizMerkle([f[1], f[0], f[2], f[3]]));
  });

  it.each([1, 2, 3, 5, 8, 13])('gera provas válidas para todas as folhas (n=%i)', (n) => {
    const f = folhas(n);
    const raiz = calcularRaizMerkle(f);
    f.forEach((folha, i) => {
      expect(verificarProvaMerkle(folha, gerarProvaMerkle(f, i), raiz)).toBe(true);
    });
  });

  it('prova falha para folha que não pertence à árvore', () => {
    const f = folhas(4);
    const raiz = calcularRaizMerkle(f);
    expect(verificarProvaMerkle(sha256('intrusa'), gerarProvaMerkle(f, 0), raiz)).toBe(false);
  });

  it('lança erro para índice fora do intervalo', () => {
    expect(() => gerarProvaMerkle(folhas(2), 5)).toThrow();
  });
});
