import { sha256 } from './criptografia';

/**
 * Árvore de Merkle (estilo Bitcoin) sobre os ids das transações de um bloco.
 *
 * A raiz resume todas as transações em um único hash. Uma "prova de Merkle"
 * permite demonstrar que uma transação faz parte do bloco enviando apenas
 * log2(n) hashes, sem expor as demais transações.
 */

export interface PassoProvaMerkle {
  hash: string;
  /** Lado em que o hash irmão deve ser concatenado. */
  posicao: 'esquerda' | 'direita';
}

const RAIZ_VAZIA = sha256('');

function combinar(esquerda: string, direita: string): string {
  return sha256(esquerda + direita);
}

function proximoNivel(nivel: string[]): string[] {
  const resultado: string[] = [];
  for (let i = 0; i < nivel.length; i += 2) {
    // Nível ímpar: o último nó é duplicado
    const direita = i + 1 < nivel.length ? nivel[i + 1] : nivel[i];
    resultado.push(combinar(nivel[i], direita));
  }
  return resultado;
}

export function calcularRaizMerkle(folhas: string[]): string {
  if (folhas.length === 0) return RAIZ_VAZIA;
  let nivel = [...folhas];
  while (nivel.length > 1) {
    nivel = proximoNivel(nivel);
  }
  return nivel[0];
}

export function gerarProvaMerkle(folhas: string[], indice: number): PassoProvaMerkle[] {
  if (indice < 0 || indice >= folhas.length) {
    throw new Error(`Índice ${indice} fora do intervalo da árvore de Merkle`);
  }
  const prova: PassoProvaMerkle[] = [];
  let nivel = [...folhas];
  let posicao = indice;

  while (nivel.length > 1) {
    const ehDireita = posicao % 2 === 1;
    const indiceIrmao = ehDireita ? posicao - 1 : Math.min(posicao + 1, nivel.length - 1);
    prova.push({ hash: nivel[indiceIrmao], posicao: ehDireita ? 'esquerda' : 'direita' });
    nivel = proximoNivel(nivel);
    posicao = Math.floor(posicao / 2);
  }
  return prova;
}

export function verificarProvaMerkle(
  folha: string,
  prova: PassoProvaMerkle[],
  raizEsperada: string,
): boolean {
  let atual = folha;
  for (const passo of prova) {
    atual = passo.posicao === 'esquerda' ? combinar(passo.hash, atual) : combinar(atual, passo.hash);
  }
  return atual === raizEsperada;
}
