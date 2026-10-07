import { Router } from 'express';
import multer from 'multer';
import { tratarErro } from '../utils/erros';
import { sha256 } from './criptografia';
import * as repositorio from './repositorio';
import * as servico from './servico';

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

export default router;
