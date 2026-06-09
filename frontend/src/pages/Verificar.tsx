import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const TIPO_LEGIVEL: Record<string, string> = {
  certificado_curso: 'Certificado de Curso',
  certificado_evento: 'Certificado de Evento',
  declaracao_participacao: 'Declaração de Participação',
  comprovante_atividade: 'Comprovante de Atividade',
  artigo_publicado: 'Artigo Publicado',
  outro: 'Outro',
};

interface RespostaVerificacao {
  valido: boolean;
  certificado: { id: string; hash: string; emitido_em: string; };
  documento: { titulo: string; tipo: string; carga_horaria: number; status: string; } | null;
  estudante: { nome: string; email: string; } | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? '';

async function verificarCertificado(hash: string): Promise<RespostaVerificacao> {
  const res = await axios.get<RespostaVerificacao>(`${API_URL}/api/publica/verificar/${hash}`);
  return res.data;
}

export function Verificar() {
  const { hash } = useParams<{ hash: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['verificar', hash],
    queryFn: () => verificarCertificado(hash!),
    enabled: !!hash,
    retry: false,
  });

  const naoEncontrado = isError && axios.isAxiosError(error) && error.response?.status === 404;

  return (
    <div className="min-h-screen bg-[#010A26] flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#618C7C]/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#618C7C]/30 bg-[#011140]">
            <svg className="h-7 w-7 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white">Valida<span className="text-[#618C7C]">AI</span></span>
          <p className="text-sm text-white/40 mt-1">Verificação de Certificado</p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="rounded-2xl border border-white/8 bg-[#011140] p-10 text-center shadow-2xl shadow-black/40">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-[#618C7C]/20 border-t-[#618C7C]" />
            <p className="mt-4 text-sm text-white/50">Verificando certificado...</p>
          </div>
        )}

        {/* Inválido / não encontrado */}
        {naoEncontrado && (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-10 text-center shadow-2xl shadow-black/40">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/25 bg-red-500/15">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-400">Certificado Inválido</h2>
            <p className="mt-2 text-sm text-red-400/70">
              Este certificado não foi encontrado ou o código de verificação é inválido.
            </p>
          </div>
        )}

        {/* Erro genérico */}
        {isError && !naoEncontrado && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-8 text-center shadow-2xl shadow-black/40">
            <p className="text-sm text-amber-300">Erro ao verificar o certificado. Tente novamente.</p>
          </div>
        )}

        {/* Certificado válido */}
        {data?.valido && (
          <div className="rounded-2xl border border-[#618C7C]/30 bg-[#011140] p-8 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#618C7C]/30 bg-[#618C7C]/20 flex-shrink-0">
                <svg className="h-7 w-7 text-[#618C7C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Certificado Válido</h2>
                <p className="text-sm text-[#618C7C]">Documento autêntico verificado pelo sistema</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/8 bg-[#011640] divide-y divide-white/6">
              {data.estudante && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/35">Estudante</p>
                  <p className="mt-1 text-base font-semibold text-white">{data.estudante.nome}</p>
                  <p className="text-sm text-white/50">{data.estudante.email}</p>
                </div>
              )}

              {data.documento && (
                <div className="px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-white/35">Atividade</p>
                  <p className="mt-1 text-base font-semibold text-white">{data.documento.titulo}</p>
                  <p className="text-sm text-white/50">
                    {TIPO_LEGIVEL[data.documento.tipo] ?? data.documento.tipo} · {data.documento.carga_horaria}h
                  </p>
                </div>
              )}

              <div className="px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/35">Emitido em</p>
                <p className="mt-1 text-sm text-white">
                  {new Date(data.certificado.emitido_em).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>

              <div className="px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/35">Código de verificação</p>
                <p className="mt-1 font-mono text-xs text-white/45 break-all">{data.certificado.hash}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
