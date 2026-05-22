import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentosService } from '../services/documentos';
import { Card } from '../components/ui/Card';
import { UploadIcon, SchoolIcon, PendingActionsIcon } from '../components/icons';
import type { StatusDocumento } from '../types';

interface CardStatus {
  label: string;
  status: StatusDocumento | '';
  cor: string;
  corTexto: string;
  corBorda: string;
  dotCor: string;
}

const CARDS_ESTUDANTE: CardStatus[] = [
  { label: 'Pendentes',  status: 'pendente',           cor: 'bg-amber-500/8',   corTexto: 'text-amber-300',  corBorda: 'border-amber-500/20',  dotCor: 'bg-amber-400'   },
  { label: 'Aprovados',  status: 'aprovado',           cor: 'bg-[#618C7C]/10',  corTexto: 'text-[#7AAA9A]',  corBorda: 'border-[#618C7C]/25',  dotCor: 'bg-[#618C7C]'   },
  { label: 'Reprovados', status: 'reprovado',          cor: 'bg-red-500/8',     corTexto: 'text-red-400',    corBorda: 'border-red-500/20',    dotCor: 'bg-red-400'     },
  { label: 'Revisão',    status: 'revisao_solicitada', cor: 'bg-blue-500/8',    corTexto: 'text-blue-300',   corBorda: 'border-blue-500/20',   dotCor: 'bg-blue-400'    },
];

const CARDS_COORDENADOR: CardStatus[] = [
  { label: 'Pendentes',  status: 'pendente',           cor: 'bg-amber-500/8',   corTexto: 'text-amber-300',  corBorda: 'border-amber-500/20',  dotCor: 'bg-amber-400'   },
  { label: 'Em Revisão', status: 'revisao_solicitada', cor: 'bg-blue-500/8',    corTexto: 'text-blue-300',   corBorda: 'border-blue-500/20',   dotCor: 'bg-blue-400'    },
  { label: 'Aprovados',  status: 'aprovado',           cor: 'bg-[#618C7C]/10',  corTexto: 'text-[#7AAA9A]',  corBorda: 'border-[#618C7C]/25',  dotCor: 'bg-[#618C7C]'   },
  { label: 'Reprovados', status: 'reprovado',          cor: 'bg-red-500/8',     corTexto: 'text-red-400',    corBorda: 'border-red-500/20',    dotCor: 'bg-red-400'     },
];

function useContagem(status: StatusDocumento | '') {
  return useQuery({
    queryKey: ['documentos-contagem', status],
    queryFn: () => documentosService.listar({ status: status || undefined, limite: 1 }),
    staleTime: 60_000,
  });
}

function CardContagem({ item, delay }: Readonly<{ item: CardStatus; delay: string }>) {
  const { data, isLoading } = useContagem(item.status);

  return (
    <Link
      to={item.status ? `/documentos?status=${item.status}` : '/documentos'}
      className={`animate-fade-up ${delay} rounded-xl border p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${item.cor} ${item.corBorda}`}
    >
      <div className={`mb-2 h-2 w-2 rounded-full ${item.dotCor}`} />
      <p className={`text-sm font-medium ${item.corTexto} opacity-80`}>{item.label}</p>
      <p className={`mt-1.5 text-3xl font-bold tracking-tight ${item.corTexto}`}>
        {isLoading ? <span className="animate-pulse">—</span> : (data?.total ?? 0)}
      </p>
      <p className={`mt-0.5 text-xs ${item.corTexto} opacity-50`}>documentos</p>
    </Link>
  );
}

export function Dashboard() {
  const { usuario } = useAuth();
  const eCoordenador = usuario?.perfil === 'coordenador' || usuario?.perfil === 'admin';
  const cards = eCoordenador ? CARDS_COORDENADOR : CARDS_ESTUDANTE;
  const delays = ['', 'delay-75', 'delay-150', 'delay-225'];

  const { data: recentes } = useQuery({
    queryKey: ['documentos-recentes'],
    queryFn: () => documentosService.listar({ limite: 5 }),
    staleTime: 30_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-up">
        <h2 className="text-xl font-semibold text-white">
          Olá, {usuario?.nome?.split(' ')[0]}
        </h2>
        <p className="mt-1 text-sm text-white/45">
          {eCoordenador ? 'Visão geral dos documentos do seu curso' : 'Acompanhe o status dos seus documentos'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card, i) => <CardContagem key={card.status} item={card} delay={delays[i]} />)}
      </div>

      <Card className="animate-fade-up delay-300">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Documentos Recentes</h3>
          <Link to="/documentos" className="text-sm text-[#618C7C] hover:text-[#7AAA9A] transition-colors">
            Ver todos →
          </Link>
        </div>

        {!recentes || recentes.dados.length === 0 ? (
          <p className="py-4 text-center text-sm text-white/35">Nenhum documento encontrado.</p>
        ) : (
          <div className="divide-y divide-white/6">
            {recentes.dados.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{doc.titulo}</p>
                  <p className="text-xs text-white/40">
                    {doc.tipo} · {doc.carga_horaria}h · {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Link to={`/documentos/${doc.id}`} className="ml-4 flex-shrink-0 text-sm text-[#618C7C] hover:text-[#7AAA9A] transition-colors">
                  Ver
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!eCoordenador && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-fade-up delay-300">
          <Link to="/documentos/novo"
            className="flex items-center gap-4 rounded-xl border border-[#618C7C]/20 bg-[#618C7C]/8 p-5 transition-all hover:border-[#618C7C]/35 hover:bg-[#618C7C]/12 hover:shadow-[0_0_20px_rgba(97,140,124,0.1)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#618C7C] text-white flex-shrink-0 shadow-lg">
              <UploadIcon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#7AAA9A]">Submeter Documento</p>
              <p className="text-xs text-white/40">Enviar PDF para validação</p>
            </div>
          </Link>

          <Link to="/certificados"
            className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/3 p-5 transition-all hover:border-white/15 hover:bg-white/6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#011640] border border-white/10 flex-shrink-0">
              <SchoolIcon className="h-5 w-5 text-white/60" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">Meus Certificados</p>
              <p className="text-xs text-white/40">Ver certificados emitidos</p>
            </div>
          </Link>
        </div>
      )}

      {eCoordenador && (
        <Link to="/documentos?status=pendente"
          className="animate-fade-up delay-300 flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/8 p-5 transition-all hover:border-amber-500/30 hover:bg-amber-500/12">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
            <PendingActionsIcon className="h-5 w-5 text-amber-300" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">Fila de Análise</p>
            <p className="text-xs text-white/40">Ver documentos aguardando validação</p>
          </div>
        </Link>
      )}
    </div>
  );
}
