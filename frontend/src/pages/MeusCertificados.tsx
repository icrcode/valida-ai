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
      <h2 className="text-xl font-semibold text-white animate-fade-up">Meus Certificados</h2>

      {isLoading && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#618C7C]/20 border-t-[#618C7C]" />
          <p className="mt-3 text-sm text-white/40">Carregando certificados...</p>
        </div>
      )}
      {isError && <p className="text-center text-red-400">Erro ao carregar certificados.</p>}

      {data?.length === 0 && (
        <Card className="py-14 text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl">
            🎓
          </div>
          <p className="text-white/60">Você ainda não possui certificados emitidos.</p>
          <p className="mt-1 text-sm text-white/35">
            Certificados são gerados automaticamente quando um documento é aprovado.
          </p>
        </Card>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((cert, i) => (
            <Card key={cert.id} className={`flex flex-col gap-4 animate-fade-up delay-${i < 4 ? i * 75 : 300}`}>
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#618C7C]/30 bg-[#618C7C]/15 text-xl flex-shrink-0">
                  🎓
                </div>
                <span className="inline-block rounded-full bg-[#618C7C]/20 px-2.5 py-0.5 text-xs font-medium text-[#7AAA9A] border border-[#618C7C]/30">
                  Emitido
                </span>
              </div>

              {cert.documento && (
                <div>
                  <p className="text-sm font-semibold text-white line-clamp-2">
                    {cert.documento.titulo}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {TIPO_LEGIVEL[cert.documento.tipo] ?? cert.documento.tipo} · {cert.documento.carga_horaria}h
                  </p>
                </div>
              )}

              <p className="text-xs text-white/35">
                Emitido em{' '}
                {new Date(cert.criado_em).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>

              <div className="mt-auto flex flex-col gap-2">
                <Button loading={baixandoId === cert.id} onClick={() => baixar(cert.id)}>
                  Baixar PDF
                </Button>
                <a href={`/verificar/${cert.hash}`} target="_blank" rel="noopener noreferrer"
                  className="text-center text-xs text-[#618C7C] hover:text-[#7AAA9A] transition-colors">
                  Ver verificação pública →
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
