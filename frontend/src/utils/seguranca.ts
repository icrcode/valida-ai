/**
 * Valida e retorna uma URL somente se o protocolo for http ou https.
 * Bloqueia javascript:, data:, vbscript: e qualquer outro esquema não seguro.
 */
export function sanitizarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Normaliza uma mensagem de erro de API para exibição ao usuário.
 * Remove campos de detalhe interno que possam expor stack traces ou dados sensíveis.
 */
export function mensagemErroSegura(err: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  const apiErr = err as { response?: { data?: { mensagem?: string; erro?: string } }; message?: string };
  const data = apiErr?.response?.data;
  // Usa apenas mensagem ou erro — nunca "detalhe" que pode conter info interna
  return data?.mensagem ?? data?.erro ?? fallback;
}
