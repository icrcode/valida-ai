import { Router } from 'express';
import { autenticar } from '../../middleware/autenticacao';
import { exigirPerfil } from '../../middleware/autorizacao';
import * as repositorio from './repositorio';
import { tratarErro } from '../../utils/erros';

const router = Router();

// GET /api/instituicoes — lista todas (autenticado)
router.get('/', autenticar, async (_req, res) => {
  try {
    const instituicoes = await repositorio.listarInstituicoes();
    res.json(instituicoes);
  } catch (err: unknown) {
    tratarErro(res, err, 'instituicoes/listar');
  }
});

// GET /api/instituicoes/:id — busca por id (autenticado)
router.get('/:id', autenticar, async (req, res) => {
  const { id } = req.params as { id: string };
  try {
    const instituicao = await repositorio.buscarInstituicaoPorId(id);
    if (!instituicao) {
      res.status(404).json({ erro: 'Instituição não encontrada' });
      return;
    }
    res.json(instituicao);
  } catch (err: unknown) {
    tratarErro(res, err, 'instituicoes/buscar');
  }
});

// POST /api/instituicoes — criar (admin)
router.post('/', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { nome, sigla, cnpj, email_contato, telefone, site, endereco, cidade, estado, dominios_email } =
    req.body as {
      nome?: string;
      sigla?: string;
      cnpj?: string;
      email_contato?: string;
      telefone?: string;
      site?: string;
      endereco?: string;
      cidade?: string;
      estado?: string;
      dominios_email?: string[];
    };

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2) {
    res.status(400).json({ erro: 'Nome inválido (mínimo 2 caracteres)' });
    return;
  }
  if (!sigla || typeof sigla !== 'string' || sigla.trim().length < 2) {
    res.status(400).json({ erro: 'Sigla inválida (mínimo 2 caracteres)' });
    return;
  }
  if (dominios_email !== undefined && !Array.isArray(dominios_email)) {
    res.status(400).json({ erro: 'dominios_email deve ser um array de strings' });
    return;
  }

  try {
    const existente = await repositorio.buscarInstituicaoPorSigla(sigla.trim());
    if (existente) {
      res.status(409).json({ erro: 'Já existe uma instituição com essa sigla' });
      return;
    }

    const instituicao = await repositorio.criarInstituicao({
      nome: nome.trim(),
      sigla: sigla.trim(),
      cnpj: cnpj?.trim() || null,
      email_contato: email_contato?.trim() || null,
      telefone: telefone?.trim() || null,
      site: site?.trim() || null,
      endereco: endereco?.trim() || null,
      cidade: cidade?.trim() || null,
      estado: estado?.trim().toUpperCase().slice(0, 2) || null,
      dominios_email: (dominios_email ?? []).map((d) => d.toLowerCase().trim()).filter(Boolean),
    });

    res.status(201).json(instituicao);
  } catch (err: unknown) {
    tratarErro(res, err, 'instituicoes/criar');
  }
});

// PUT /api/instituicoes/:id — atualizar (admin)
router.put('/:id', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { nome, sigla, cnpj, email_contato, telefone, site, endereco, cidade, estado, dominios_email } =
    req.body as {
      nome?: string;
      sigla?: string;
      cnpj?: string | null;
      email_contato?: string | null;
      telefone?: string | null;
      site?: string | null;
      endereco?: string | null;
      cidade?: string | null;
      estado?: string | null;
      dominios_email?: string[];
    };

  if (nome !== undefined && (typeof nome !== 'string' || nome.trim().length < 2)) {
    res.status(400).json({ erro: 'Nome inválido (mínimo 2 caracteres)' });
    return;
  }
  if (sigla !== undefined && (typeof sigla !== 'string' || sigla.trim().length < 2)) {
    res.status(400).json({ erro: 'Sigla inválida (mínimo 2 caracteres)' });
    return;
  }
  if (dominios_email !== undefined && !Array.isArray(dominios_email)) {
    res.status(400).json({ erro: 'dominios_email deve ser um array de strings' });
    return;
  }

  try {
    const instituicao = await repositorio.atualizarInstituicao(id, {
      nome: nome?.trim(),
      sigla: sigla?.trim(),
      cnpj: cnpj ?? undefined,
      email_contato: email_contato ?? undefined,
      telefone: telefone ?? undefined,
      site: site ?? undefined,
      endereco: endereco ?? undefined,
      cidade: cidade ?? undefined,
      estado: estado?.trim().toUpperCase().slice(0, 2) ?? undefined,
      dominios_email: dominios_email?.map((d) => d.toLowerCase().trim()).filter(Boolean),
    });

    if (!instituicao) {
      res.status(404).json({ erro: 'Instituição não encontrada' });
      return;
    }

    res.json(instituicao);
  } catch (err: unknown) {
    tratarErro(res, err, 'instituicoes/atualizar');
  }
});

// PATCH /api/instituicoes/:id/ativa — ativar/desativar (admin)
router.patch('/:id/ativa', autenticar, exigirPerfil('admin'), async (req, res) => {
  const { id } = req.params as { id: string };
  const { ativa } = req.body as { ativa?: boolean };

  if (typeof ativa !== 'boolean') {
    res.status(400).json({ erro: 'Campo "ativa" deve ser boolean' });
    return;
  }

  try {
    const instituicao = await repositorio.alterarAtiva(id, ativa);
    if (!instituicao) {
      res.status(404).json({ erro: 'Instituição não encontrada' });
      return;
    }
    res.json(instituicao);
  } catch (err: unknown) {
    tratarErro(res, err, 'instituicoes/alterarAtiva');
  }
});

export default router;
