import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const TIPO_LEGIVEL: Record<string, string> = {
  estagio: 'Estágio',
  tcc: 'Trabalho de Conclusão de Curso',
  extensao: 'Atividade de Extensão',
  monitoria: 'Monitoria',
};

interface RespostaVerificacao {
  valido: boolean;
  certificado: {
    id: string;
    hash: string;
    emitido_em: string;
  };
  documento: {
    titulo: string;
    tipo: string;
    carga_horaria: number;
    status: string;
  } | null;
  estudante: {
    nome: string;
    email: string;
  } | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? '';

async function verificarCertificado(hash: string): Promise<RespostaVerificacao> {
  const res = await axios.get<RespostaVerificacao>(
    `${API_URL}/api/publica/verificar/${hash}`,
  );
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

  const naoEncontrado =
    isError && axios.isAxiosError(error) && error.response?.status === 404;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-blue-700">Valida AI</span>
          <p className="text-sm text-gray-500 mt-1">Verificação de Certificado</p>
        </div>

        {isLoading && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-gray-500">Verificando certificado...</p>
          </div>
        )}

        {naoEncontrado && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-8 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-700">Certificado Inválido</h2>
            <p className="mt-2 text-red-600">
              Este certificado não foi encontrado ou o código de verificação é inválido.
            </p>
          </div>
        )}

        {isError && !naoEncontrado && (
          <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-8 shadow-sm text-center">
            <p className="text-yellow-700">Erro ao verificar o certificado. Tente novamente.</p>
          </div>
        )}

        {data && data.valido && (
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-700">Certificado Válido</h2>
                <p className="text-sm text-green-600">Documento autêntico verificado pelo sistema</p>
              </div>
            </div>

            <div className="space-y-4 rounded-lg bg-white p-5 border border-green-200">
              {data.estudante && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Estudante</p>
                  <p className="text-base font-semibold text-gray-900">{data.estudante.nome}</p>
                  <p className="text-sm text-gray-500">{data.estudante.email}</p>
                </div>
              )}

              {data.documento && (
                <>
                  <hr className="border-gray-100" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Atividade</p>
                    <p className="text-base font-semibold text-gray-900">{data.documento.titulo}</p>
                    <p className="text-sm text-gray-500">
                      {TIPO_LEGIVEL[data.documento.tipo] ?? data.documento.tipo} ·{' '}
                      {data.documento.carga_horaria}h
                    </p>
                  </div>
                </>
              )}

              <hr className="border-gray-100" />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Emitido em</p>
                <p className="text-sm text-gray-700">
                  {new Date(data.certificado.emitido_em).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <hr className="border-gray-100" />

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Código de verificação</p>
                <p className="font-mono text-xs text-gray-500 break-all">{data.certificado.hash}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
