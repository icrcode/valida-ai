import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { documentosService } from '../services/documentos';
import { Card } from '../components/ui/Card';
import type { StatusDocumento } from '../types';

interface CardStatus {
  label: string;
  status: StatusDocumento | '';
  cor: string;
  corTexto: string;
  corBorda: string;
}

const CARDS_ESTUDANTE: CardStatus[] = [
  { label: 'Pendentes', status: 'pendente', cor: 'bg-yellow-50', corTexto: 'text-yellow-700', corBorda: 'border-yellow-200' },
  { label: 'Aprovados', status: 'aprovado', cor: 'bg-green-50', corTexto: 'text-green-700', corBorda: 'border-green-200' },
  { label: 'Reprovados', status: 'reprovado', cor: 'bg-red-50', corTexto: 'text-red-700', corBorda: 'border-red-200' },
  { label: 'Revisão', status: 'revisao_solicitada', cor: 'bg-blue-50', corTexto: 'text-blue-700', corBorda: 'border-blue-200' },
];

const CARDS_COORDENADOR: CardStatus[] = [
  { label: 'Pendentes', status: 'pendente', cor: 'bg-yellow-50', corTexto: 'text-yellow-700', corBorda: 'border-yellow-200' },
  { label: 'Em Revisão', status: 'revisao_solicitada', cor: 'bg-blue-50', corTexto: 'text-blue-700', corBorda: 'border-blue-200' },
  { label: 'Aprovados', status: 'aprovado', cor: 'bg-green-50', corTexto: 'text-green-700', corBorda: 'border-green-200' },
  { label: 'Reprovados', status: 'reprovado', cor: 'bg-red-50', corTexto: 'text-red-700', corBorda: 'border-red-200' },
];

function useContagem(status: StatusDocumento | '') {
  return useQuery({
    queryKey: ['documentos-contagem', status],
    queryFn: () => documentosService.listar({ status: status || undefined, limite: 1 }),
    staleTime: 60_000,
  });
}

function CardContagem({ item }: { item: CardStatus }) {
  const { data, isLoading } = useContagem(item.status);

  return (
    <Link
      to={item.status ? `/documentos?status=${item.status}` : '/documentos'}
      className={`rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md ${item.cor} ${item.corBorda}`}
    >
      <p className={`text-sm font-medium ${item.corTexto}`}>{item.label}</p>
      <p className={`mt-2 text-3xl font-bold ${item.corTexto}`}>
        {isLoading ? '—' : (data?.total ?? 0)}
      </p>
      <p className={`mt-1 text-xs ${item.corTexto} opacity-70`}>documentos</p>
    </Link>
  );
}

export function Dashboard() {
  const { usuario } = useAuth();
  const eCoordenador = usuario?.perfil === 'coordenador' || usuario?.perfil === 'admin';
  const cards = eCoordenador ? CARDS_COORDENADOR : CARDS_ESTUDANTE;

  const { data: recentes } = useQuery({
    queryKey: ['documentos-recentes'],
    queryFn: () => documentosService.listar({ limite: 5 }),
    staleTime: 30_000,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Olá, {usuario?.nome?.split(' ')[0]} 👋
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {eCoordenador
            ? 'Visão geral dos documentos do seu curso'
            : 'Acompanhe o status dos seus documentos'}
        </p>
      </div>

      {/* Cards de contagem */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((card) => (
          <CardContagem key={card.status} item={card} />
        ))}
      </div>

      {/* Documentos recentes */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Documentos Recentes</h3>
          <Link to="/documentos" className="text-sm text-blue-600 hover:underline">
            Ver todos
          </Link>
        </div>

        {!recentes || recentes.dados.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum documento encontrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentes.dados.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{doc.titulo}</p>
                  <p className="text-xs text-gray-500">
                    {doc.tipo} · {doc.carga_horaria}h ·{' '}
                    {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Link
                  to={`/documentos/${doc.id}`}
                  className="ml-4 flex-shrink-0 text-sm text-blue-600 hover:underline"
                >
                  Ver
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Atalhos */}
      {!eCoordenador && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link
            to="/documentos/novo"
            className="flex items-center gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 p-5 hover:bg-blue-100 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-xl font-bold">
              +
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-700">Submeter Documento</p>
              <p className="text-xs text-blue-500">Enviar PDF para validação</p>
            </div>
          </Link>

          <Link
            to="/certificados"
            className="flex items-center gap-3 rounded-xl border border-dashed border-green-300 bg-green-50 p-5 hover:bg-green-100 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-xl">
              🎓
            </div>
            <div>
              <p className="text-sm font-semibold text-green-700">Meus Certificados</p>
              <p className="text-xs text-green-500">Ver certificados emitidos</p>
            </div>
          </Link>
        </div>
      )}

      {eCoordenador && (
        <Link
          to="/documentos?status=pendente"
          className="flex items-center gap-3 rounded-xl border border-dashed border-yellow-300 bg-yellow-50 p-5 hover:bg-yellow-100 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-white text-xl">
            📋
          </div>
          <div>
            <p className="text-sm font-semibold text-yellow-700">Fila de Análise</p>
            <p className="text-xs text-yellow-600">Ver documentos aguardando validação</p>
          </div>
        </Link>
      )}
    </div>
  );
}
