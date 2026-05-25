import { useRef, useState, type FormEvent, type ChangeEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { documentosService } from '../services/documentos';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { InfoIcon, UploadIcon } from '../components/icons';

const TIPOS_DOCUMENTO = [
  { value: 'certificado_curso',       label: 'Certificado de Curso' },
  { value: 'certificado_evento',      label: 'Certificado de Evento' },
  { value: 'declaracao_participacao', label: 'Declaração de Participação' },
  { value: 'comprovante_atividade',   label: 'Comprovante de Atividade' },
  { value: 'artigo_publicado',        label: 'Artigo Publicado' },
  { value: 'outro',                   label: 'Outro' },
] as const;

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
  return `w-full rounded-lg border bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 ${
    comErro ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
  }`;
}

function Campo({ label, erro, hint, children }: Readonly<{ label: string; erro?: string; hint?: string; children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-white/65">{label}</label>
      {children}
      {hint && !erro && <p className="text-xs text-white/35">{hint}</p>}
      {erro && <p className="text-xs text-red-400">{erro}</p>}
    </div>
  );
}

export function SubmeterDocumento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [campos, setCampos] = useState<Campos>({ titulo: '', tipo: '', carga_horaria: '' });
  const [erros, setErros] = useState<CampoErros>({});

  const mutation = useMutation({
    mutationFn: (fd: FormData) => documentosService.submeter(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-contagem'] });
      addToast('Documento enviado com sucesso!', 'success');
      navigate('/documentos');
    },
    onError: () => addToast('Erro ao enviar o documento. Verifique os dados.', 'error'),
  });

  function atualizar(campo: keyof Campos) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setCampos((c) => ({ ...c, [campo]: e.target.value }));
      setErros((er) => ({ ...er, [campo]: undefined }));
    };
  }

  function validar(): boolean {
    const novosErros: CampoErros = {};
    if (!campos.titulo.trim() || campos.titulo.trim().length < 3)
      novosErros.titulo = 'Mínimo 3 caracteres';
    if (!campos.tipo)
      novosErros.tipo = 'Selecione o tipo do documento';
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

  return (
    <div className="mx-auto max-w-lg animate-fade-up flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold text-white">Submeter Documento</h2>
        <p className="mt-1 text-sm text-white/45">
          Preencha os dados do comprovante e envie o arquivo para análise do coordenador.
        </p>
      </div>

      {/* Aviso PDF */}
      <div className="flex items-start gap-3 rounded-lg border border-[#618C7C]/25 bg-[#618C7C]/8 px-4 py-3">
        <InfoIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#7AAA9A]" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-[#7AAA9A]">Por que apenas PDF?</p>
          <p className="text-xs text-white/45 leading-relaxed">
            O formato PDF preserva a formatação original do documento e é universalmente aceito. Ele garante que o
            coordenador veja exatamente o que foi emitido pela instituição, sem risco de alteração acidental.
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Campo label="Título" erro={erros.titulo}
            hint="Use o nome que consta no próprio documento (ex: Certificado de Participação — Workshop React).">
            <input type="text" value={campos.titulo} onChange={atualizar('titulo')}
              placeholder="Nome do documento" className={inputCls(!!erros.titulo)} />
          </Campo>

          <Campo label="Tipo de documento" erro={erros.tipo}>
            <select
              value={campos.tipo}
              onChange={atualizar('tipo')}
              className={`w-full rounded-lg border bg-[#011640] px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 [&>option]:bg-[#011640] ${
                campos.tipo ? 'text-white' : 'text-white/30'
              } ${erros.tipo ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
            >
              <option value="" disabled>Selecione o tipo…</option>
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Campo>

          <Campo label="Carga Horária (horas)" erro={erros.carga_horaria}
            hint="Informe apenas o número de horas registradas no documento.">
            <input type="number" min={1} value={campos.carga_horaria} onChange={atualizar('carga_horaria')}
              placeholder="ex: 40" className={inputCls(!!erros.carga_horaria)} />
          </Campo>

          <Campo label="Arquivo PDF" erro={erros.arquivo}
            hint="Tamanho máximo: 10 MB. Certifique-se de enviar o arquivo original, não uma foto.">
            <label className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-[#011640] px-3 py-2.5 transition-all hover:border-white/20 ${
              erros.arquivo ? 'border-red-500/50' : 'border-white/10'
            }`}>
              <UploadIcon className="h-4 w-4 flex-shrink-0 text-[#618C7C]" aria-hidden />
              <span className="text-sm text-white/50 truncate">
                {fileRef.current?.files?.[0]?.name ?? 'Escolher arquivo PDF…'}
              </span>
              <input ref={fileRef} type="file" accept="application/pdf" className="sr-only"
                onChange={() => {
                  setErros((er) => ({ ...er, arquivo: undefined }));
                  /* force re-render to show filename */
                  setCampos((c) => ({ ...c }));
                }} />
            </label>
          </Campo>

          <div className="flex gap-3 pt-2 border-t border-white/8">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Submeter documento
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
