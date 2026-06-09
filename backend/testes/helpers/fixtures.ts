import type { Documento } from '../../src/modulos/documentos/repositorio';

export const DOC_MOCK: Documento = {
  id: 'doc-1',
  titulo: 'Certificado XYZ',
  tipo: 'certificado_curso',
  carga_horaria: 40,
  estudante_id: 'estudante-id',
  curso_id: 'curso-1',
  status: 'pendente',
  coordenador_id: null,
  nome_arquivo: 'certificado.pdf',
  caminho_arquivo: 'documentos/estudante-id/certificado.pdf',
  tamanho_arquivo: 1024,
  mime_type: 'application/pdf',
  criado_em: new Date(),
  atualizado_em: new Date(),
};
