import type { Documento } from '../../src/modulos/documentos/repositorio';

export const DOC_MOCK: Documento = {
  id: 'doc-1',
  titulo: 'Estágio XYZ',
  tipo: 'estagio',
  carga_horaria: 40,
  estudante_id: 'estudante-id',
  curso_id: 'curso-1',
  status: 'pendente',
  coordenador_id: null,
  nome_arquivo: 'estagio.pdf',
  caminho_arquivo: 'documentos/estudante-id/estagio.pdf',
  tamanho_arquivo: 1024,
  mime_type: 'application/pdf',
  criado_em: new Date(),
  atualizado_em: new Date(),
};
