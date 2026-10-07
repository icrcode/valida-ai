import { Router } from 'express';
import multer from 'multer';
import { tratarErro } from '../utils/erros';
import { sha256 } from './criptografia';
import * as repositorio from './repositorio';
import * as servico from './servico';
import * as servicoFabric from './fabric/servico';
import * as outbox from './fabric/outbox';
import { verificarConformidade, type Rotulo } from '../pesquisa/conformidade';
import { planejarEndosso, type Peer } from '../pesquisa/endosso';
import type { Estrategia } from '../pesquisa/astar';

/**
 * Explorador público da blockchain (somente leitura).
 * A cadeia não contém dados pessoais em claro, então pode ser auditada por qualquer pessoa.
 */
const router = Router();

const HASH_REGEX = /^[a-f0-9]{64}$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/blockchain/status
router.get('/status', async (_req, res) => {
  try {
    res.json(await servico.obterStatus());
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/validar — revalida toda a cadeia (hashes, Merkle, PoW, assinaturas)
router.get('/validar', async (_req, res) => {
  try {
    res.json(await servico.validarCadeiaCompleta());
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/blocos?pagina=1&limite=10
router.get('/blocos', async (req, res) => {
  const pagina = Math.max(Number.parseInt((req.query.pagina as string) || '1', 10) || 1, 1);
  const limite = Math.min(Math.max(Number.parseInt((req.query.limite as string) || '10', 10) || 10, 1), 50);
  try {
    const resultado = await repositorio.listarPaginado(pagina, limite);
    res.json({ ...resultado, pagina, limite });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/blocos/:id — por altura (número) ou hash
router.get('/blocos/:id', async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    let bloco = null;
    if (/^\d+$/.test(id)) {
      bloco = await repositorio.buscarBloco(Number.parseInt(id, 10));
    } else if (HASH_REGEX.test(id)) {
      bloco = await repositorio.buscarBlocoPorHash(id.toLowerCase());
    }
    if (!bloco) {
      res.status(404).json({ erro: 'Bloco não encontrado' });
      return;
    }
    res.json(bloco);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/transacoes/:id — transação + prova de Merkle
router.get('/transacoes/:id', async (req, res) => {
  const { id } = req.params as { id: string };
  if (!HASH_REGEX.test(id)) {
    res.status(400).json({ erro: 'Id de transação inválido (esperado SHA-256 hex)' });
    return;
  }
  try {
    const prova = await servico.provaTransacao(id.toLowerCase());
    if (!prova) {
      res.status(404).json({ erro: 'Transação não encontrada' });
      return;
    }
    res.json(prova);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/documentos/:documentoId — linha do tempo imutável do documento
router.get('/documentos/:documentoId', async (req, res) => {
  const { documentoId } = req.params as { documentoId: string };
  try {
    const historico = await servico.historicoDocumento(documentoId);
    res.json({ documentoId, registrado: historico.length > 0, historico });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/arquivos/:hash — o arquivo com este SHA-256 está registrado?
router.get('/arquivos/:hash', async (req, res) => {
  const { hash } = req.params as { hash: string };
  if (!HASH_REGEX.test(hash)) {
    res.status(400).json({ erro: 'Hash inválido (esperado SHA-256 hex)' });
    return;
  }
  try {
    const provas = await servico.provasPorHashArquivo(hash.toLowerCase());
    res.json({ hashArquivo: hash.toLowerCase(), registrado: provas.length > 0, provas });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// POST /api/blockchain/verificar-arquivo — envia o PDF, calcula o hash e procura na cadeia
router.post('/verificar-arquivo', upload.single('arquivo'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ erro: 'Arquivo é obrigatório (campo: arquivo)' });
    return;
  }
  try {
    const hashArquivo = sha256(req.file.buffer);
    const provas = await servico.provasPorHashArquivo(hashArquivo);
    res.json({ hashArquivo, registrado: provas.length > 0, provas });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// ───────────────────────── Hyperledger Fabric ─────────────────────────

// GET /api/blockchain/fabric/status — conexão, fila do outbox e conferência do último checkpoint
router.get('/fabric/status', async (_req, res) => {
  try {
    res.json(await servicoFabric.statusFabric());
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/fabric/documentos/:documentoId — registro do documento no ledger do Fabric
router.get('/fabric/documentos/:documentoId', async (req, res) => {
  const { documentoId } = req.params as { documentoId: string };
  try {
    const doc = await servicoFabric.documentoNoFabric(documentoId);
    if (!doc) {
      res.status(404).json({ erro: 'Documento não registrado no Fabric' });
      return;
    }
    res.json(doc);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/fabric/rejeitadas — eventos que o chaincode recusou (violações de regra)
router.get('/fabric/rejeitadas', async (_req, res) => {
  try {
    res.json(await outbox.listarRejeitadas());
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// ───────────────────────── Pesquisa: A* ─────────────────────────

const ESTRATEGIAS: Estrategia[] = ['astar', 'dijkstra', 'weighted', 'guloso'];

function lerOpcoesBusca(query: Record<string, unknown>) {
  const estrategia = ESTRATEGIAS.includes(query.estrategia as Estrategia) ? (query.estrategia as Estrategia) : 'astar';
  const modo = query.modo === 'prefixo' ? ('prefixo' as const) : ('completo' as const);
  return { estrategia, modo };
}

// GET /api/blockchain/conformidade/:documentoId?modo=completo|prefixo&estrategia=astar
router.get('/conformidade/:documentoId', async (req, res) => {
  const { documentoId } = req.params as { documentoId: string };
  try {
    res.json(await servicoFabric.auditarDocumento(documentoId, lerOpcoesBusca(req.query)));
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/blockchain/conformidade?limite=200 — auditoria de todos os documentos da cadeia
router.get('/conformidade', async (req, res) => {
  const limite = Math.min(Math.max(Number.parseInt((req.query.limite as string) || '200', 10) || 200, 1), 1000);
  const opcoes = lerOpcoesBusca(req.query);
  try {
    const tracos = await repositorio.listarTracosDocumentos(limite);
    const resultados = tracos.map((t) => ({
      documentoId: t.documento_id,
      traco: t.tipos as Rotulo[],
      ...verificarConformidade(t.tipos as Rotulo[], opcoes),
    }));
    const naoConformes = resultados.filter((r) => !r.conforme);
    res.json({
      opcoes,
      documentos: resultados.length,
      conformes: resultados.length - naoConformes.length,
      aptidaoMedia: resultados.length ? resultados.reduce((a, r) => a + r.aptidao, 0) / resultados.length : 1,
      nosExpandidos: resultados.reduce((a, r) => a + r.metricas.nosExpandidos, 0),
      naoConformes: naoConformes.map(({ documentoId, traco, custo, anomalias }) => ({ documentoId, traco, custo, anomalias })),
    });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// POST /api/blockchain/pesquisa/endosso — { politica: "AND('Org1MSP.peer', ...)", peers: Peer[], estrategia? }
router.post('/pesquisa/endosso', (req, res) => {
  const { politica, peers, estrategia } = req.body as { politica?: string; peers?: Peer[]; estrategia?: Estrategia };
  if (typeof politica !== 'string' || !Array.isArray(peers) || peers.length === 0 || peers.length > 500) {
    res.status(400).json({ erro: 'Informe politica (texto) e peers (1 a 500 itens)' });
    return;
  }
  try {
    res.json(planejarEndosso(politica, peers, { estrategia: ESTRATEGIAS.includes(estrategia!) ? estrategia : 'astar', limiteExpansoes: 200_000 }));
  } catch (err: unknown) {
    res.status(400).json({ erro: err instanceof Error ? err.message : 'Entrada inválida' });
  }
});

export default router;
