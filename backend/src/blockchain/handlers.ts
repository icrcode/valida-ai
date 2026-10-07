import registrador from '../utils/registrador';
import { barramento } from '../eventos/barramento';
import { criarTransacao, type TipoTransacao } from './cadeia';
import { sha256 } from './criptografia';
import { registrarTransacao } from './servico';

/**
 * Ouve os eventos de domínio e grava cada um como transação na blockchain.
 *
 * Privacidade (LGPD): a cadeia é pública para consulta, então só guardamos ids de documento,
 * hashes de arquivos e *hashes* de dados pessoais (avaliador, observações) — nunca nomes,
 * e-mails ou o conteúdo do PDF. O hash permite provar um dado sem revelá-lo.
 */

function gravar(entrada: Parameters<typeof criarTransacao>[0]): void {
  registrarTransacao(criarTransacao(entrada)).catch((err: unknown) => {
    registrador.error(
      `[blockchain] falha ao registrar ${entrada.tipo} | documento=${entrada.documentoId} | ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  });
}

function decisao(tipo: TipoTransacao, p: { documentoId: string; coordenadorId: string; observacoes?: string }) {
  gravar({
    tipo,
    documentoId: p.documentoId,
    dados: {
      avaliador: sha256(p.coordenadorId),
      ...(p.observacoes ? { hashObservacoes: sha256(p.observacoes) } : {}),
    },
  });
}

export function registrarHandlersBlockchain(): void {
  barramento.ao('documento_submetido', (p) => {
    gravar({
      tipo: 'DOCUMENTO_SUBMETIDO',
      documentoId: p.documentoId,
      hashArquivo: p.hashArquivo ?? null,
      dados: { tipoDocumento: p.tipo, curso: sha256(p.cursoId) },
    });
  });

  barramento.ao('documento_aprovado', (p) => decisao('DOCUMENTO_APROVADO', p));
  barramento.ao('documento_reprovado', (p) => decisao('DOCUMENTO_REPROVADO', p));
  barramento.ao('documento_revisao_solicitada', (p) => decisao('REVISAO_SOLICITADA', p));

  barramento.ao('documento_cancelado', (p) => {
    gravar({ tipo: 'DOCUMENTO_CANCELADO', documentoId: p.documentoId });
  });

  barramento.ao('certificado_emitido', (p) => {
    gravar({
      tipo: 'CERTIFICADO_EMITIDO',
      documentoId: p.documentoId,
      hashArquivo: p.hashArquivo,
      dados: { codigoVerificacao: p.codigoVerificacao },
    });
  });

  registrador.info('[blockchain] handlers registrados — eventos de documento serão gravados na cadeia');
}
