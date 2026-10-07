import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  blockchainService,
  calcularSha256,
  ROTULO_TRANSACAO,
  type Bloco,
  type ProvaInclusao,
} from '../services/blockchain';

function encurtar(hash: string, n = 10) {
  return hash.length > n * 2 ? `${hash.slice(0, n)}…${hash.slice(-n)}` : hash;
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

function Painel({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-[#011140] p-6 shadow-2xl shadow-black/40">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/50">{titulo}</h2>
      {children}
    </section>
  );
}

function Campo({ rotulo, valor, mono = false }: { rotulo: string; valor: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-white/35">{rotulo}</p>
      <p className={`mt-1 break-all text-sm text-white ${mono ? 'font-mono text-xs text-white/70' : ''}`}>{valor}</p>
    </div>
  );
}

function StatusCadeia() {
  const status = useQuery({ queryKey: ['blockchain', 'status'], queryFn: blockchainService.status });
  const validacao = useMutation({ mutationFn: blockchainService.validar });

  return (
    <Painel titulo="Estado da cadeia">
      {status.isLoading && <p className="text-sm text-white/50">Carregando…</p>}
      {status.isError && <p className="text-sm text-amber-300">Blockchain indisponível.</p>}
      {status.data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Altura" valor={status.data.altura + 1 > 0 ? `${status.data.altura + 1} blocos` : 'vazia'} />
          <Campo rotulo="Dificuldade (PoW)" valor={`${status.data.dificuldade} zeros`} />
          <Campo rotulo="Validadores" valor={status.data.validadoresAutorizados.length} />
          <Campo rotulo="Último hash" valor={status.data.ultimoHash ?? '—'} mono />
          <Campo rotulo="Hash do gênese" valor={status.data.hashGenese ?? '—'} mono />
          <Campo rotulo="Validador deste nó" valor={encurtar(status.data.validadorDesteNo, 16)} mono />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => validacao.mutate()}
          disabled={validacao.isPending}
          className="rounded-lg bg-[#618C7C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#557a6c] disabled:opacity-50"
        >
          {validacao.isPending ? 'Auditando…' : 'Auditar integridade da cadeia'}
        </button>
        {validacao.data?.valida && (
          <span className="text-sm text-[#7fb8a3]">
            ✓ Cadeia íntegra — {validacao.data.blocosVerificados} blocos verificados (hashes, Merkle, PoW e assinaturas)
          </span>
        )}
        {validacao.data && !validacao.data.valida && (
          <div className="text-sm text-red-400">
            ✗ Adulteração detectada:
            <ul className="mt-1 list-inside list-disc">
              {validacao.data.erros.slice(0, 10).map((e, i) => (
                <li key={i}>
                  bloco #{e.altura}: {e.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}
        {validacao.isError && <span className="text-sm text-amber-300">Erro ao auditar.</span>}
      </div>
    </Painel>
  );
}

function ListaProvas({ provas }: { provas: ProvaInclusao[] }) {
  return (
    <ol className="space-y-3">
      {provas.map((p) => (
        <li key={p.transacao.id} className="rounded-xl border border-white/8 bg-[#011640] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-white">{ROTULO_TRANSACAO[p.transacao.tipo]}</span>
            <span className={`text-xs ${p.provaValida ? 'text-[#7fb8a3]' : 'text-red-400'}`}>
              {p.provaValida ? '✓ prova de Merkle válida' : '✗ prova inválida'} · {p.confirmacoes} confirmação(ões)
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Bloco" valor={`#${p.bloco.altura} · ${dataHora(p.bloco.timestamp)}`} />
            <Campo rotulo="Documento" valor={p.transacao.documentoId ?? '—'} mono />
            <Campo rotulo="Transação" valor={p.transacao.id} mono />
            <Campo rotulo="Hash do bloco" valor={p.bloco.hash} mono />
          </div>
        </li>
      ))}
    </ol>
  );
}

function VerificarArquivo() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const verificacao = useMutation({
    mutationFn: async (f: File) => blockchainService.buscarPorHashArquivo(await calcularSha256(f)),
  });

  return (
    <Painel titulo="Verificar um PDF">
      <p className="mb-4 text-sm text-white/50">
        O hash SHA-256 é calculado no seu navegador — o arquivo não é enviado. Se uma única vírgula do PDF
        for alterada, o hash muda e o documento não é encontrado na cadeia.
      </p>
      <form
        className="flex flex-wrap items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (arquivo) verificacao.mutate(arquivo);
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
        />
        <button
          type="submit"
          disabled={!arquivo || verificacao.isPending}
          className="rounded-lg bg-[#618C7C] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#557a6c] disabled:opacity-50"
        >
          {verificacao.isPending ? 'Verificando…' : 'Verificar'}
        </button>
      </form>

      {verificacao.data && (
        <div className="mt-5 space-y-3">
          <Campo rotulo="SHA-256 do arquivo" valor={verificacao.data.hashArquivo} mono />
          {verificacao.data.registrado ? (
            <>
              <p className="text-sm font-semibold text-[#7fb8a3]">✓ Arquivo autêntico — registrado na blockchain</p>
              <ListaProvas provas={verificacao.data.provas} />
            </>
          ) : (
            <p className="text-sm font-semibold text-red-400">
              ✗ Nenhum registro encontrado. O arquivo não foi submetido ao sistema ou foi modificado.
            </p>
          )}
        </div>
      )}
      {verificacao.isError && <p className="mt-4 text-sm text-amber-300">Erro ao verificar o arquivo.</p>}
    </Painel>
  );
}

function LinhaBloco({ bloco }: { bloco: Bloco }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li className="rounded-xl border border-white/8 bg-[#011640]">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="font-semibold text-white">Bloco #{bloco.altura}</span>
        <span className="font-mono text-xs text-white/50">{encurtar(bloco.hash)}</span>
        <span className="text-xs text-white/40">
          {bloco.transacoes.length} tx · {dataHora(bloco.timestamp)}
        </span>
      </button>
      {aberto && (
        <div className="space-y-4 border-t border-white/8 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo rotulo="Hash" valor={bloco.hash} mono />
            <Campo rotulo="Hash anterior" valor={bloco.hashAnterior} mono />
            <Campo rotulo="Raiz de Merkle" valor={bloco.raizMerkle} mono />
            <Campo rotulo="Nonce / dificuldade" valor={`${bloco.nonce} / ${bloco.dificuldade}`} />
            <Campo rotulo="Validador (Ed25519)" valor={encurtar(bloco.validador, 16)} mono />
            <Campo rotulo="Assinatura" valor={encurtar(bloco.assinatura, 16)} mono />
          </div>
          <ul className="space-y-2">
            {bloco.transacoes.map((tx) => (
              <li key={tx.id} className="rounded-lg border border-white/6 px-3 py-2">
                <p className="text-sm text-white">{ROTULO_TRANSACAO[tx.tipo] ?? tx.tipo}</p>
                <p className="font-mono text-xs text-white/45 break-all">tx {tx.id}</p>
                {tx.documentoId && <p className="font-mono text-xs text-white/45 break-all">doc {tx.documentoId}</p>}
                {tx.hashArquivo && <p className="font-mono text-xs text-white/45 break-all">arquivo {tx.hashArquivo}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

function ListaBlocos() {
  const [pagina, setPagina] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['blockchain', 'blocos', pagina],
    queryFn: () => blockchainService.listarBlocos(pagina, 10),
  });
  const totalPaginas = data ? Math.max(Math.ceil(data.total / data.limite), 1) : 1;

  return (
    <Painel titulo="Blocos recentes">
      {isLoading && <p className="text-sm text-white/50">Carregando…</p>}
      {isError && <p className="text-sm text-amber-300">Não foi possível carregar os blocos.</p>}
      {data && data.dados.length === 0 && <p className="text-sm text-white/50">Nenhum bloco ainda.</p>}
      {data && data.dados.length > 0 && (
        <>
          <ul className="space-y-2">
            {data.dados.map((b) => (
              <LinhaBloco key={b.hash} bloco={b} />
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-white/50">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="disabled:opacity-30">
              ← Mais novos
            </button>
            <span>
              Página {pagina} de {totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="disabled:opacity-30"
            >
              Mais antigos →
            </button>
          </div>
        </>
      )}
    </Painel>
  );
}

export function Blockchain() {
  return (
    <div className="min-h-screen bg-[#010A26] px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="text-center">
          <Link to="/" className="text-2xl font-bold text-white">
            Valida<span className="text-[#618C7C]">AI</span>
          </Link>
          <p className="mt-1 text-sm text-white/40">Explorador da blockchain de documentos</p>
        </header>
        <StatusCadeia />
        <VerificarArquivo />
        <ListaBlocos />
      </div>
    </div>
  );
}
