import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { usuariosService } from '../services/usuarios';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const schema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
});
type FormData = z.infer<typeof schema>;

const PERFIL_LABEL: Record<string, string> = {
  estudante: 'Estudante',
  coordenador: 'Coordenador',
  admin: 'Administrador',
};

export function Perfil() {
  const { usuario, login } = useAuth();
  const token = localStorage.getItem('token') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: usuario?.nome ?? '' },
  });

  const mutation = useMutation({
    mutationFn: ({ nome }: FormData) => usuariosService.atualizarNome(nome),
    onSuccess: (atualizado) => {
      login(token, atualizado);
    },
  });

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
        </dl>
      </Card>

      <Card>
        <h3 className="mb-4 font-medium text-gray-900">Atualizar Nome</h3>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
          <Input
            id="nome"
            label="Nome"
            error={errors.nome?.message}
            {...register('nome')}
          />
          {isSubmitSuccessful && mutation.isSuccess && (
            <p className="text-sm text-green-600">Nome atualizado com sucesso!</p>
          )}
          {mutation.isError && (
            <p className="text-sm text-red-500">Erro ao atualizar nome.</p>
          )}
          <Button type="submit" loading={mutation.isPending}>
            Salvar
          </Button>
        </form>
      </Card>
    </div>
  );
}
