import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentosService } from '../services/documentos';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const schema = z.object({
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  tipo: z.string().min(2, 'Informe o tipo'),
  carga_horaria: z
    .string()
    .min(1, 'Campo obrigatório')
    .refine((v) => {
      const n = Number.parseInt(v, 10);
      return !Number.isNaN(n) && n > 0;
    }, 'Carga horária deve ser um inteiro positivo'),
});
type FormData = z.infer<typeof schema>;

export function SubmeterDocumento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const fd = new FormData();
      fd.append('titulo', data.titulo);
      fd.append('tipo', data.tipo);
      fd.append('carga_horaria', data.carga_horaria);
      if (fileRef.current?.files?.[0]) {
        fd.append('arquivo', fileRef.current.files[0]);
      }
      return documentosService.submeter(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      navigate('/documentos');
    },
  });

  function onSubmit(data: FormData) {
    if (!fileRef.current?.files?.[0]) return;
    mutation.mutate(data);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Submeter Documento</h2>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            id="titulo"
            label="Título"
            placeholder="Nome do documento"
            error={errors.titulo?.message}
            {...register('titulo')}
          />
          <Input
            id="tipo"
            label="Tipo"
            placeholder="ex: extensao, pesquisa, monitoria"
            error={errors.tipo?.message}
            {...register('tipo')}
          />
          <Input
            id="carga_horaria"
            label="Carga Horária (horas)"
            type="number"
            min={1}
            error={errors.carga_horaria?.message}
            {...register('carga_horaria')}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="arquivo" className="text-sm font-medium text-gray-700">
              Arquivo PDF
            </label>
            <input
              id="arquivo"
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700"
            />
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-500">
              Erro ao submeter.{' '}
              {(mutation.error as { response?: { data?: { erro?: string } } })?.response?.data
                ?.erro ?? 'Verifique os dados e tente novamente.'}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Submeter
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
