import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { certificadosService } from '../services/certificados';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const TIPO_LEGIVEL: Record<string, string> = {
  estagio: 'Estágio',
  tcc: 'TCC',
  extensao: 'Extensão',
  monitoria: 'Monitoria',
};

export function MeusCertificados() {
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['meus-certificados'],
    queryFn: () => certificadosService.listar(),
  });

  const { mutate: baixar } = useMutation({
    mutationFn: (id: string) => certificadosService.buscarUrlDownload(id),
    onMutate: (id) => setBaixandoId(id),
    onSettled: () => setBaixandoId(null),
    onSuccess: ({ url }) => window.open(url, '_blank'),
  });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-900">Meus Certificados</h2>

      {isLoading && <p className="text-center text-gray-500">Carregando...</p>}
      {isError && <p className="text-center text-red-500">Erro ao carregar certificados.</p>}

      {data && data.length === 0 && (
        <Card className="py-12 text-center">
          <p className="text-gray-500">Você ainda não possui certificados emitidos.</p>
          <p className="mt-1 text-sm text-gray-400">
            Certificados são gerados automaticamente quando um documento é aprovado.
          </p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((cert) => (
            <Card key={cert.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl flex-shrink-0">
                  🎓
                </div>
                <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Emitido
                </span>
              </div>

              {cert.documento && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {cert.documento.titulo}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {TIPO_LEGIVEL[cert.documento.tipo] ?? cert.documento.tipo} ·{' '}
                    {cert.documento.carga_horaria}h
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Emitido em{' '}
                {new Date(cert.criado_em).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>

              <div className="mt-auto flex flex-col gap-2">
                <Button
                  variant="primary"
                  loading={baixandoId === cert.id}
                  onClick={() => baixar(cert.id)}
                >
                  Baixar PDF
                </Button>
                <a
                  href={`/verificar/${cert.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center text-xs text-blue-600 hover:underline"
                >
                  Ver verificação pública
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
