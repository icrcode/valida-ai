import { Response } from 'express';

export function tratarErro(res: Response, err: unknown): void {
  const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
  res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
}

export function tratarErroComNaoEncontrado(res: Response, err: unknown): void {
  const mensagem = err instanceof Error ? err.message : 'Erro desconhecido';
  if (mensagem.includes('não encontrado')) {
    res.status(404).json({ erro: mensagem });
    return;
  }
  res.status(500).json({ erro: 'Erro interno', detalhe: mensagem });
}

export function verificarAcessoDocumento(
  res: Response,
  documento: { estudante_id: string } | null | undefined,
  perfil: string,
  usuarioId: string,
): boolean {
  if (!documento) {
    res.status(404).json({ erro: 'Documento não encontrado' });
    return false;
  }
  if (perfil === 'estudante' && documento.estudante_id !== usuarioId) {
    res.status(403).json({ erro: 'Sem permissão para este documento' });
    return false;
  }
  return true;
}
