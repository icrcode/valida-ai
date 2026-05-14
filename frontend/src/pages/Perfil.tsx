import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { usuariosService } from '../services/usuarios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PERFIL_LABEL, PERFIL_COR, iniciais } from '../utils/perfil';

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="flex-shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="text-right text-sm text-gray-900 break-all">{value}</dd>
    </div>
  );
}

export function Perfil() {
  const { usuario, login } = useAuth();
  const { addToast } = useToast();
  const token = localStorage.getItem('token') ?? '';

  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [nomeErro, setNomeErro] = useState('');

  const { data: perfilServidor } = useQuery({
    queryKey: ['perfil'],
    queryFn: () => usuariosService.getPerfil(),
    staleTime: 30_000,
  });

  const dados = perfilServidor ?? usuario;

  const mutation = useMutation({
    mutationFn: () => usuariosService.atualizarNome(nome.trim()),
    onSuccess: (atualizado) => {
      login(token, atualizado);
      addToast('Nome atualizado com sucesso!', 'success');
    },
    onError: () => addToast('Erro ao atualizar nome. Tente novamente.', 'error'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || nome.trim().length < 2) {
      setNomeErro('Nome deve ter no mínimo 2 caracteres');
      return;
    }
    if (nome.trim() === dados?.nome) {
      setNomeErro('O nome é igual ao atual');
      return;
    }
    setNomeErro('');
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-6 text-xl font-semibold text-gray-900">Meu Perfil</h2>

      {/* Avatar + identidade */}
      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {dados?.nome ? iniciais(dados.nome) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-gray-900">{dados?.nome}</p>
            <p className="truncate text-sm text-gray-500">{dados?.email}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                PERFIL_COR[dados?.perfil ?? ''] ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {PERFIL_LABEL[dados?.perfil ?? ''] ?? dados?.perfil}
            </span>
          </div>
        </div>
      </Card>

      {/* Informações da conta */}
      <Card className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Informações da conta
        </h3>
        <dl className="divide-y divide-gray-100">
          <InfoRow label="E-mail" value={dados?.email} />
          <InfoRow label="Matrícula" value={dados?.matricula} />
          <InfoRow label="Instituição" value={dados?.instituicao_nome} />
          <InfoRow label="Curso" value={dados?.curso_id} />
        </dl>
        {!dados?.matricula && !dados?.instituicao_nome && !dados?.curso_id && (
          <p className="mt-1 text-xs text-gray-400">
            Informações adicionais não disponíveis. Contate o administrador.
          </p>
        )}
      </Card>

      {/* Editar nome */}
      <Card>
        <h3 className="mb-4 font-medium text-gray-900">Atualizar nome</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome completo
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (nomeErro) setNomeErro('');
              }}
              placeholder="Seu nome completo"
              className={`rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                nomeErro ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {nomeErro && <p className="text-xs text-red-500">{nomeErro}</p>}
          </div>

          <Button type="submit" loading={mutation.isPending}>
            Salvar nome
          </Button>
        </form>
      </Card>
    </div>
  );
}
