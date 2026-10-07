export interface EventoDocumentoSubmetido {
  documentoId: string;
  estudanteId: string;
  cursoId: string;
  titulo: string;
  tipo: string;
  /** SHA-256 do PDF submetido — registrado na blockchain. */
  hashArquivo?: string;
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

export interface EventoDocumentoCancelado {
  documentoId: string;
  estudanteId: string;
}

export interface EventoCertificadoEmitido {
  documentoId: string;
  estudanteId: string;
  /** Código público usado em /verificar/:hash. */
  codigoVerificacao: string;
  /** SHA-256 do PDF do certificado. */
  hashArquivo: string;
}

export interface MapaEventos {
  documento_submetido: EventoDocumentoSubmetido;
  documento_aprovado: EventoDocumentoAprovado;
  documento_reprovado: EventoDocumentoReprovado;
  documento_revisao_solicitada: EventoDocumentoRevisaoSolicitada;
  documento_cancelado: EventoDocumentoCancelado;
  certificado_emitido: EventoCertificadoEmitido;
}
