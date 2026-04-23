import { useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentosService } from '../services/documentos';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface Campos {
  titulo: string;
  tipo: string;
  carga_horaria: string;
}

interface CampoErros {
  titulo?: string;
  tipo?: string;
  carga_horaria?: string;
  arquivo?: string;
}

function inputCls(comErro: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    comErro ? 'border-red-500 bg-red-50' : 'border-gray-300'
  }`;
}

function Campo({
  label,
  erro,
  children,
}: {
  label: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {erro && <p className="text-xs text-red-500">{erro}</p>}
    </div>
  );
}

export function SubmeterDocumento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [campos, setCampos] = useState<Campos>({ titulo: '', tipo: '', carga_horaria: '' });
  const [erros, setErros] = useState<CampoErros>({});

  const mutation = useMutation({
    mutationFn: (fd: FormData) => documentosService.submeter(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      navigate('/documentos');
    },
  });

  function atualizar(campo: keyof Campos) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setCampos((c) => ({ ...c, [campo]: e.target.value }));
      setErros((er) => ({ ...er, [campo]: undefined }));
    };
  }

  function validar(): boolean {
    const novosErros: CampoErros = {};
    if (!campos.titulo.trim() || campos.titulo.trim().length < 3)
      novosErros.titulo = 'Mínimo 3 caracteres';
    if (!campos.tipo.trim() || campos.tipo.trim().length < 2)
      novosErros.tipo = 'Informe o tipo do documento';
    const n = Number.parseInt(campos.carga_horaria, 10);
    if (!campos.carga_horaria || Number.isNaN(n) || n <= 0)
      novosErros.carga_horaria = 'Informe um número inteiro positivo';
    if (!fileRef.current?.files?.[0]) novosErros.arquivo = 'Selecione um arquivo PDF';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    const fd = new FormData();
    fd.append('titulo', campos.titulo.trim());
    fd.append('tipo', campos.tipo.trim());
    fd.append('carga_horaria', campos.carga_horaria);
    fd.append('arquivo', fileRef.current!.files![0]);
    mutation.mutate(fd);
  }

  const errApi =
    (mutation.error as { response?: { data?: { erro?: string } } } | null)?.response?.data?.erro;

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">Submeter Documento</h2>
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Campo label="Título" erro={erros.titulo}>
            <input
              type="text"
              value={campos.titulo}
              onChange={atualizar('titulo')}
              placeholder="Nome do documento"
              className={inputCls(!!erros.titulo)}
            />
          </Campo>

          <Campo label="Tipo" erro={erros.tipo}>
            <input
              type="text"
              value={campos.tipo}
              onChange={atualizar('tipo')}
              placeholder="ex: extensao, pesquisa, monitoria"
              className={inputCls(!!erros.tipo)}
            />
          </Campo>

          <Campo label="Carga Horária (horas)" erro={erros.carga_horaria}>
            <input
              type="number"
              min={1}
              value={campos.carga_horaria}
              onChange={atualizar('carga_horaria')}
              className={inputCls(!!erros.carga_horaria)}
            />
          </Campo>

          <Campo label="Arquivo PDF" erro={erros.arquivo}>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              onChange={() => setErros((er) => ({ ...er, arquivo: undefined }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700"
            />
          </Campo>

          {mutation.isError && (
            <p className="text-sm text-red-500">
              {errApi ?? 'Erro ao submeter. Verifique os dados e tente novamente.'}
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
