import { pool } from '../../banco/conexao';

export interface Instituicao {
  id: string;
  nome: string;
  sigla: string;
  cnpj: string | null;
  email_contato: string | null;
  telefone: string | null;
  site: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  dominios_email: string[];
  ativa: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

export interface CriarInstituicaoInput {
  nome: string;
  sigla: string;
  cnpj?: string | null;
  email_contato?: string | null;
  telefone?: string | null;
  site?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  dominios_email?: string[];
}

export type AtualizarInstituicaoInput = Partial<CriarInstituicaoInput>;

export async function listarInstituicoes(): Promise<Instituicao[]> {
  const res = await pool.query<Instituicao>(
    `SELECT id, nome, sigla, cnpj, email_contato, telefone, site,
            endereco, cidade, estado, dominios_email, ativa, criado_em, atualizado_em
     FROM instituicoes
     ORDER BY nome ASC`,
  );
  return res.rows;
}

export async function buscarInstituicaoPorId(id: string): Promise<Instituicao | null> {
  const res = await pool.query<Instituicao>(
    `SELECT id, nome, sigla, cnpj, email_contato, telefone, site,
            endereco, cidade, estado, dominios_email, ativa, criado_em, atualizado_em
     FROM instituicoes
     WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function buscarInstituicaoPorSigla(sigla: string): Promise<Instituicao | null> {
  const res = await pool.query<Instituicao>(
    `SELECT id FROM instituicoes WHERE UPPER(sigla) = UPPER($1)`,
    [sigla],
  );
  return res.rows[0] ?? null;
}

export async function criarInstituicao(dados: CriarInstituicaoInput): Promise<Instituicao> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO instituicoes
       (nome, sigla, cnpj, email_contato, telefone, site, endereco, cidade, estado, dominios_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      dados.nome,
      dados.sigla.toUpperCase(),
      dados.cnpj ?? null,
      dados.email_contato ?? null,
      dados.telefone ?? null,
      dados.site ?? null,
      dados.endereco ?? null,
      dados.cidade ?? null,
      dados.estado ?? null,
      dados.dominios_email ?? [],
    ],
  );
  const instituicao = await buscarInstituicaoPorId(res.rows[0].id);
  if (!instituicao) throw new Error('Falha ao recuperar instituição após criação');
  return instituicao;
}

export async function atualizarInstituicao(
  id: string,
  dados: AtualizarInstituicaoInput,
): Promise<Instituicao | null> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  let idx = 1;

  if (dados.nome !== undefined)          { campos.push(`nome = $${idx++}`);          valores.push(dados.nome); }
  if (dados.sigla !== undefined)         { campos.push(`sigla = $${idx++}`);         valores.push(dados.sigla.toUpperCase()); }
  if (dados.cnpj !== undefined)          { campos.push(`cnpj = $${idx++}`);          valores.push(dados.cnpj); }
  if (dados.email_contato !== undefined) { campos.push(`email_contato = $${idx++}`); valores.push(dados.email_contato); }
  if (dados.telefone !== undefined)      { campos.push(`telefone = $${idx++}`);      valores.push(dados.telefone); }
  if (dados.site !== undefined)          { campos.push(`site = $${idx++}`);          valores.push(dados.site); }
  if (dados.endereco !== undefined)      { campos.push(`endereco = $${idx++}`);      valores.push(dados.endereco); }
  if (dados.cidade !== undefined)        { campos.push(`cidade = $${idx++}`);        valores.push(dados.cidade); }
  if (dados.estado !== undefined)        { campos.push(`estado = $${idx++}`);        valores.push(dados.estado); }
  if (dados.dominios_email !== undefined){ campos.push(`dominios_email = $${idx++}`);valores.push(dados.dominios_email); }

  if (campos.length === 0) return buscarInstituicaoPorId(id);

  campos.push(`atualizado_em = NOW()`);
  valores.push(id);

  await pool.query(
    `UPDATE instituicoes SET ${campos.join(', ')} WHERE id = $${idx}`,
    valores,
  );
  return buscarInstituicaoPorId(id);
}

export async function alterarAtiva(id: string, ativa: boolean): Promise<Instituicao | null> {
  await pool.query(
    `UPDATE instituicoes SET ativa = $1, atualizado_em = NOW() WHERE id = $2`,
    [ativa, id],
  );
  return buscarInstituicaoPorId(id);
}
