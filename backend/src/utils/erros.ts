import { Response } from 'express';
import registrador from './registrador';

export function tratarErro(res: Response, err: unknown, contexto?: string): void {
  const prefixo = contexto ? `[${contexto}] ` : '';
  if (err instanceof Error) {
    registrador.error(`${prefixo}${err.message}`, { stack: err.stack });
  } else {
    registrador.error(`${prefixo}Erro desconhecido`, { err });
  }
  const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
  res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
}

export function tratarErroComNaoEncontrado(res: Response, err: unknown, contexto?: string): void {
  const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
  if (mensagem.includes('não encontrado')) {
    res.status(404).json({ erro: mensagem });
    return;
  }
  tratarErro(res, err, contexto);
}

export function verificarAcessoDocumento(
  res: Response,
  documento: { estudante_id: string; curso_id: string } | null | undefined,
  perfil: string,
  usuarioId: string,
  cursoId?: string | null,
): boolean {
  if (!documento) {
    res.status(404).json({ erro: 'Documento não encontrado' });
    return false;
  }
  if (perfil === 'estudante' && documento.estudante_id !== usuarioId) {
    res.status(403).json({ erro: 'Sem permissão para este documento' });
    return false;
  }
  if (perfil === 'coordenador' && documento.curso_id !== cursoId) {
    res.status(403).json({ erro: 'Sem permissão: documento pertence a outro curso' });
    return false;
  }
  return true;
}
