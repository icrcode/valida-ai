import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cursosService } from '../services/cursos';
import { Card } from '../components/ui/Card';
import { GroupIcon } from '../components/icons';

export function Alunos() {
  const { data: cursos = [], isLoading: carregandoCursos } = useQuery({
    queryKey: ['meus-cursos'],
    queryFn: cursosService.meus,
  });

  const [cursoSelecionado, setCursoSelecionado] = useState<string | null>(null);
  const cursoAtivo = cursoSelecionado ?? cursos[0]?.id ?? null;

  const { data: alunos = [], isLoading: carregandoAlunos } = useQuery({
    queryKey: ['alunos-curso', cursoAtivo],
    queryFn: () => cursosService.listarAlunos(cursoAtivo!),
    enabled: !!cursoAtivo,
  });

  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      <div>
        <h2 className="text-xl font-semibold text-white">Alunos</h2>
        <p className="mt-1 text-sm text-white/45">Estudantes vinculados aos cursos sob sua coordenação</p>
      </div>

      {carregandoCursos && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#618C7C]/20 border-t-[#618C7C]" />
        </div>
      )}

      {!carregandoCursos && cursos.length === 0 && (
        <Card className="py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
            <GroupIcon className="h-7 w-7 text-white/40" aria-hidden />
          </div>
          <p className="text-white/60">Você ainda não está vinculado a nenhum curso.</p>
        </Card>
      )}

      {cursos.length > 0 && (
        <>
          {/* Abas por curso */}
          <div className="flex flex-wrap gap-2 border-b border-white/8">
            {cursos.map((curso) => (
              <button
                key={curso.id}
                type="button"
                onClick={() => setCursoSelecionado(curso.id)}
                className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-all ${
                  cursoAtivo === curso.id
                    ? 'border-[#618C7C] text-[#7AAA9A]'
                    : 'border-transparent text-white/50 hover:text-white'
                }`}
              >
                {curso.nome}
              </button>
            ))}
          </div>

          {carregandoAlunos && (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#618C7C]/20 border-t-[#618C7C]" />
            </div>
          )}

          {!carregandoAlunos && alunos.length === 0 && (
            <Card className="py-12 text-center">
              <p className="text-white/45">Nenhum aluno vinculado a este curso.</p>
            </Card>
          )}

          {!carregandoAlunos && alunos.length > 0 && (
            <Card className="overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-white/8 bg-white/3">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">E-mail</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Matrícula</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-white/40">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((aluno) => (
                    <tr key={aluno.id} className="border-b border-white/6 transition-colors hover:bg-white/3">
                      <td className="px-4 py-3 font-medium text-white">{aluno.nome}</td>
                      <td className="px-4 py-3 text-white/55">{aluno.email}</td>
                      <td className="px-4 py-3 text-white/55">{aluno.matricula ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          aluno.ativo
                            ? 'border-[#618C7C]/30 bg-[#618C7C]/15 text-[#7AAA9A]'
                            : 'border-red-500/30 bg-red-500/15 text-red-300'
                        }`}>
                          {aluno.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
