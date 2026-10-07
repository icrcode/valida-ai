import {
  calcularIdTransacao,
  criarBlocoGenese,
  criarTransacao,
  minerarBloco,
  validarCadeia,
  obterValidadoresAutorizados,
  atendeDificuldade,
  HASH_ZERO,
  type Bloco,
} from '../../../src/blockchain/cadeia';
import { gerarParDeChaves, serializarCanonico, sha256 } from '../../../src/blockchain/criptografia';

const DIFICULDADE = 2;
const validador = gerarParDeChaves();

function montarCadeia(qtdBlocos: number): Bloco[] {
  const cadeia = [criarBlocoGenese(validador, DIFICULDADE)];
  for (let i = 1; i <= qtdBlocos; i++) {
    const anterior = cadeia[cadeia.length - 1];
    cadeia.push(
      minerarBloco({
        altura: anterior.altura + 1,
        hashAnterior: anterior.hash,
        dificuldade: DIFICULDADE,
        validador,
        transacoes: [
          criarTransacao({ tipo: 'DOCUMENTO_SUBMETIDO', documentoId: `doc-${i}`, hashArquivo: sha256(`pdf-${i}`) }),
          criarTransacao({ tipo: 'DOCUMENTO_APROVADO', documentoId: `doc-${i}` }),
        ],
      }),
    );
  }
  return cadeia;
}

/** Cópia profunda para simular adulteração sem afetar outros testes. */
function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

describe('serializarCanonico', () => {
  it('produz a mesma string independentemente da ordem das chaves', () => {
    expect(serializarCanonico({ b: 1, a: { d: 2, c: [3, { f: 1, e: 0 }] } })).toBe(
      serializarCanonico({ a: { c: [3, { e: 0, f: 1 }], d: 2 }, b: 1 }),
    );
  });
});

describe('bloco gênese', () => {
  it('tem altura 0, hashAnterior zerado e autoriza o validador', () => {
    const genese = criarBlocoGenese(validador, DIFICULDADE);
    expect(genese.altura).toBe(0);
    expect(genese.hashAnterior).toBe(HASH_ZERO);
    expect(obterValidadoresAutorizados(genese)).toContain(validador.chavePublica);
  });
});

describe('minerarBloco', () => {
  it('gera hash que atende a dificuldade (proof of work)', () => {
    const [, bloco] = montarCadeia(1);
    expect(atendeDificuldade(bloco.hash, DIFICULDADE)).toBe(true);
    expect(bloco.hash.startsWith('00')).toBe(true);
  });
});

describe('validarCadeia', () => {
  it('aceita uma cadeia íntegra', () => {
    const resultado = validarCadeia(montarCadeia(3));
    expect(resultado).toEqual({ valida: true, blocosVerificados: 4, erros: [] });
  });

  it('aceita cadeia vazia', () => {
    expect(validarCadeia([]).valida).toBe(true);
  });

  it('detecta alteração no hash de um arquivo registrado', () => {
    const cadeia = clonar(montarCadeia(3));
    cadeia[2].transacoes[0].hashArquivo = sha256('pdf-falsificado');
    const resultado = validarCadeia(cadeia);
    expect(resultado.valida).toBe(false);
    expect(resultado.erros.some((e) => e.altura === 2 && e.motivo.includes('adulterada'))).toBe(true);
  });

  it('detecta adulteração mesmo se o atacante recalcular o id da transação (Merkle)', () => {
    const cadeia = clonar(montarCadeia(2));
    const forjada = criarTransacao({ tipo: 'DOCUMENTO_APROVADO', documentoId: 'doc-falso' });
    cadeia[1].transacoes[1] = forjada;
    const resultado = validarCadeia(cadeia);
    expect(resultado.erros.some((e) => e.motivo.includes('Merkle'))).toBe(true);
  });

  it('detecta remoção de bloco no meio da cadeia', () => {
    const cadeia = montarCadeia(3);
    const resultado = validarCadeia([cadeia[0], cadeia[1], cadeia[3]]);
    expect(resultado.valida).toBe(false);
    expect(resultado.erros.some((e) => e.motivo.includes('cadeia quebrada'))).toBe(true);
  });

  it('rejeita bloco remontado e reassinado por validador não autorizado', () => {
    const cadeia = montarCadeia(2);
    const intruso = gerarParDeChaves();
    const falso = minerarBloco({
      altura: 2,
      hashAnterior: cadeia[1].hash,
      dificuldade: DIFICULDADE,
      validador: intruso,
      transacoes: [criarTransacao({ tipo: 'DOCUMENTO_APROVADO', documentoId: 'doc-x' })],
    });
    const resultado = validarCadeia([cadeia[0], cadeia[1], falso]);
    expect(resultado.erros).toEqual([{ altura: 2, motivo: 'bloco assinado por validador não autorizado' }]);
  });

  it('detecta assinatura inválida', () => {
    const cadeia = clonar(montarCadeia(1));
    cadeia[1].assinatura = Buffer.from('x'.repeat(64)).toString('base64');
    expect(validarCadeia(cadeia).erros.some((e) => e.motivo.includes('assinatura'))).toBe(true);
  });

  it('detecta proof of work inválido', () => {
    const cadeia = clonar(montarCadeia(1));
    cadeia[1].dificuldade = 64;
    const motivos = validarCadeia(cadeia).erros.map((e) => e.motivo);
    expect(motivos.some((m) => m.includes('proof of work'))).toBe(true);
  });
});

describe('compatibilidade com o chaincode do Fabric', () => {
  it('calcula o mesmo id que fabric/chaincode/valida-documentos (vetor de teste)', () => {
    expect(
      calcularIdTransacao({
        tipo: 'DOCUMENTO_SUBMETIDO',
        documentoId: 'doc-vetor',
        hashArquivo: 'a'.repeat(64),
        dados: { tipoDocumento: 'outro', curso: 'b'.repeat(64) },
        timestamp: '2026-01-01T00:00:00.000Z',
        sal: '0011223344556677',
      }),
    ).toBe('bd10495930100b82164a5c2e3a2adfd7513820867e08897c2e35b5bbd35a045f');
  });
});
