export interface EventoDocumentoSubmetido {
  documentoId: string;
  estudanteId: string;
  cursoId: string;
  titulo: string;
  tipo: string;
}

export interface EventoDocumentoAprovado {
  documentoId: string;
  estudanteId: string;
  coordenadorId: string;
  titulo: string;
}

export interface EventoDocumentoReprovado {
  documentoId: string;
  estudanteId: string;
  coordenadorId: string;
  titulo: string;
  observacoes: string;
}

export interface EventoDocumentoRevisaoSolicitada {
  documentoId: string;
  estudanteId: string;
  coordenadorId: string;
  titulo: string;
  observacoes: string;
}

export interface MapaEventos {
  documento_submetido: EventoDocumentoSubmetido;
  documento_aprovado: EventoDocumentoAprovado;
  documento_reprovado: EventoDocumentoReprovado;
  documento_revisao_solicitada: EventoDocumentoRevisaoSolicitada;
}
