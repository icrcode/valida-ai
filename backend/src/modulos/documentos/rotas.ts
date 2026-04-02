import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { autenticar } from '../../middleware/autenticacao';
import { exigirPerfil } from '../../middleware/autorizacao';
import * as repositorio from './repositorio';
import { buscarPorId as buscarUsuario } from '../usuarios/repositorio';
import * as armazenamento from '../../servicos/armazenamento';
import { tratarErro } from '../../utils/erros';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos'));
    }
  },
});

// GET /api/documentos — listar com filtros e paginação
router.get('/', autenticar, async (req, res) => {
  const { status, tipo, estudante_id, page, limite } = req.query as Record<string, string>;

  try {
    const resultado = await repositorio.listar(
      {
        status,
        tipo,
        estudante_id,
        page: page ? Number.parseInt(page, 10) : undefined,
        limite: limite ? Number.parseInt(limite, 10) : undefined,
      },
      req.usuario!.sub,
      req.usuario!.perfil,
    );

    res.json({
      dados: resultado.dados,
      total: resultado.total,
      pagina: Number.parseInt(page || '1', 10),
      limite: Math.min(Number.parseInt(limite || '10', 10), 100),
    });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/documentos/:id
router.get('/:id', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const documento = await repositorio.buscarPorId(id);
    if (!documento) {
      res.status(404).json({ erro: 'Documento não encontrado' });
      return;
    }

    if (req.usuario!.perfil === 'estudante' && documento.estudante_id !== req.usuario!.sub) {
      res.status(403).json({ erro: 'Sem permissão para este documento' });
      return;
    }

    res.json(documento);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// GET /api/documentos/:id/download — URL assinada do MinIO
router.get('/:id/download', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const documento = await repositorio.buscarPorId(id);
    if (!documento) {
      res.status(404).json({ erro: 'Documento não encontrado' });
      return;
    }

    if (req.usuario!.perfil === 'estudante' && documento.estudante_id !== req.usuario!.sub) {
      res.status(403).json({ erro: 'Sem permissão para este documento' });
      return;
    }

    const url = await armazenamento.gerarUrlAssinada(documento.caminho_arquivo);
    res.json({ url, expira_em: new Date(Date.now() + 3600 * 1000).toISOString() });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// POST /api/documentos — submissão com arquivo PDF
router.post('/', autenticar, exigirPerfil('estudante'), upload.single('arquivo'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ erro: 'Arquivo PDF é obrigatório (campo: arquivo)' });
    return;
  }

  const { titulo, tipo, carga_horaria } = req.body as Record<string, string>;
  if (!titulo || !tipo || !carga_horaria) {
    res.status(400).json({ erro: 'Campos obrigatórios: titulo, tipo, carga_horaria' });
    return;
  }

  const cargaHorariaNum = Number.parseInt(carga_horaria, 10);
  if (Number.isNaN(cargaHorariaNum) || cargaHorariaNum <= 0) {
    res.status(400).json({ erro: 'carga_horaria deve ser um número inteiro positivo' });
    return;
  }

  try {
    const usuario = await buscarUsuario(req.usuario!.sub);
    if (!usuario?.curso_id) {
      res.status(422).json({ erro: 'Usuário não possui curso associado' });
      return;
    }

    const ext = path.extname(req.file.originalname) || '.pdf';
    const chaveArquivo = `documentos/${req.usuario!.sub}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

    await armazenamento.fazerUpload(req.file.buffer, chaveArquivo, req.file.mimetype);

    const documento = await repositorio.criar({
      titulo,
      tipo,
      carga_horaria: cargaHorariaNum,
      estudante_id: req.usuario!.sub,
      curso_id: usuario.curso_id,
      nome_arquivo: req.file.originalname,
      caminho_arquivo: chaveArquivo,
      tamanho_arquivo: req.file.size,
      mime_type: req.file.mimetype,
    });

    res.status(201).json(documento);
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

// DELETE /api/documentos/:id — cancelar (apenas dono, apenas status pendente)
router.delete('/:id', autenticar, exigirPerfil('estudante'), async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const documento = await repositorio.cancelar(id, req.usuario!.sub);
    if (!documento) {
      res
        .status(404)
        .json({ erro: 'Documento não encontrado, não está pendente, ou sem permissão' });
      return;
    }
    res.json({ mensagem: 'Documento cancelado com sucesso', documento });
  } catch (err: unknown) {
    tratarErro(res, err);
  }
});

export default router;
