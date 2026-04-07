import { barramento } from '../../../src/eventos/barramento';
import type {
  EventoDocumentoSubmetido,
  EventoDocumentoAprovado,
  EventoDocumentoReprovado,
  EventoDocumentoRevisaoSolicitada,
} from '../../../src/eventos/tipos';

afterEach(() => barramento.removeAllListeners());

const submetido: EventoDocumentoSubmetido = {
  documentoId: 'doc-1',
  estudanteId: 'est-1',
  cursoId: 'curso-1',
  titulo: 'Estágio XYZ',
  tipo: 'estagio',
};

const aprovado: EventoDocumentoAprovado = {
  documentoId: 'doc-1',
  estudanteId: 'est-1',
  coordenadorId: 'coord-1',
  titulo: 'Estágio XYZ',
};

const reprovado: EventoDocumentoReprovado = {
  ...aprovado,
  observacoes: 'Documentação incompleta',
};

const revisao: EventoDocumentoRevisaoSolicitada = {
  ...aprovado,
  observacoes: 'Ajustar carga horária',
};

describe('barramento — emitir / ao', () => {
  it('handler registrado com ao() recebe o payload correto', () => {
    const handler = jest.fn();
    barramento.ao('documento_submetido', handler);
    barramento.emitir('documento_submetido', submetido);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(submetido);
  });

  it('retorna false quando nenhum handler está registrado', () => {
    const resultado = barramento.emitir('documento_aprovado', aprovado);
    expect(resultado).toBe(false);
  });

  it('retorna true quando há pelo menos um handler registrado', () => {
    barramento.ao('documento_aprovado', jest.fn());
    const resultado = barramento.emitir('documento_aprovado', aprovado);
    expect(resultado).toBe(true);
  });

  it('múltiplos handlers para o mesmo evento são todos chamados', () => {
    const h1 = jest.fn();
    const h2 = jest.fn();
    barramento.ao('documento_reprovado', h1);
    barramento.ao('documento_reprovado', h2);
    barramento.emitir('documento_reprovado', reprovado);
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('handlers de eventos distintos não se interferem', () => {
    const handlerAprovado = jest.fn();
    const handlerReprovado = jest.fn();
    barramento.ao('documento_aprovado', handlerAprovado);
    barramento.ao('documento_reprovado', handlerReprovado);

    barramento.emitir('documento_aprovado', aprovado);
    expect(handlerAprovado).toHaveBeenCalledTimes(1);
    expect(handlerReprovado).not.toHaveBeenCalled();
  });

  it('emite documento_revisao_solicitada com payload correto', () => {
    const handler = jest.fn();
    barramento.ao('documento_revisao_solicitada', handler);
    barramento.emitir('documento_revisao_solicitada', revisao);
    expect(handler).toHaveBeenCalledWith(revisao);
  });
});
