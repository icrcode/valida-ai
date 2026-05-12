import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { usuariosService } from '../services/usuarios';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const PERFIL_LABEL: Record<string, string> = {
  estudante: 'Estudante',
  coordenador: 'Coordenador',
  admin: 'Administrador',
};

export function Perfil() {
  const { usuario, login } = useAuth();
  const token = localStorage.getItem('token') ?? '';

  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [nomeErro, setNomeErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const mutation = useMutation({
    mutationFn: () => usuariosService.atualizarNome(nome.trim()),
    onSuccess: (atualizado) => {
      login(token, atualizado);
      setSucesso(true);
      setTimeout(() => setSucesso(false), 3000);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSucesso(false);
    if (!nome.trim() || nome.trim().length < 2) {
      setNomeErro('Nome deve ter no mínimo 2 caracteres');
      return;
    }
    setNomeErro('');
    mutation.mutate();
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Meu Perfil</h2>

      <Card className="mb-4">
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-xs font-medium text-gray-500">E-mail</dt>
            <dd className="mt-1 text-sm text-gray-900">{usuario?.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Perfil</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {PERFIL_LABEL[usuario?.perfil ?? ''] ?? usuario?.perfil}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Nome atual</dt>
            <dd className="mt-1 text-sm text-gray-900">{usuario?.nome}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h3 className="mb-4 font-medium text-gray-900">Atualizar Nome</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => {
                setNome(e.target.value);
                if (nomeErro) setNomeErro('');
                if (sucesso) setSucesso(false);
              }}
              className={`rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                nomeErro ? 'border-red-500 bg-red-50' : 'border-gray-300'
              }`}
            />
            {nomeErro && <p className="text-xs text-red-500">{nomeErro}</p>}
          </div>

          {sucesso && <p className="text-sm text-green-600">Nome atualizado com sucesso!</p>}
          {mutation.isError && <p className="text-sm text-red-500">Erro ao atualizar nome.</p>}

          <Button type="submit" loading={mutation.isPending}>
            Salvar
          </Button>
        </form>
      </Card>
    </div>
  );
}
