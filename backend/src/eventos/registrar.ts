import registrador from '../utils/registrador';
import { barramento } from './barramento';
import { aoDocumentoSubmetido } from './handlers/documento-submetido';
import { aoDocumentoAprovado } from './handlers/documento-aprovado';
import { aoDocumentoReprovado } from './handlers/documento-reprovado';
import { aoDocumentoRevisaoSolicitada } from './handlers/documento-revisao-solicitada';

export function registrarHandlers(): void {
  barramento.ao('documento_submetido', (payload) => {
    void aoDocumentoSubmetido(payload);
  });

  barramento.ao('documento_aprovado', (payload) => {
    void aoDocumentoAprovado(payload);
  });

  barramento.ao('documento_reprovado', (payload) => {
    void aoDocumentoReprovado(payload);
  });

  barramento.ao('documento_revisao_solicitada', (payload) => {
    void aoDocumentoRevisaoSolicitada(payload);
  });

  registrador.info('[eventos] handlers registrados: documento_submetido, documento_aprovado, documento_reprovado, documento_revisao_solicitada');
}
