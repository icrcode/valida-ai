import { describe, it, expect } from 'vitest';
import { sanitizarUrl, mensagemErroSegura } from '../../utils/seguranca';

describe('sanitizarUrl', () => {
  it('retorna URL https válida', () => {
    expect(sanitizarUrl('https://exemplo.com')).toBe('https://exemplo.com');
  });

  it('retorna URL http local válida', () => {
    expect(sanitizarUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('bloqueia protocolo javascript:', () => {
    expect(sanitizarUrl('javascript:alert(1)')).toBeNull();
  });

  it('bloqueia protocolo data:', () => {
    expect(sanitizarUrl('data:text/html,<h1>xss</h1>')).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(sanitizarUrl('')).toBeNull();
  });

  it('retorna null para null', () => {
    expect(sanitizarUrl(null)).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(sanitizarUrl(undefined)).toBeNull();
  });

  it('retorna null para URL inválida', () => {
    expect(sanitizarUrl('nao-e-uma-url')).toBeNull();
  });
});

describe('mensagemErroSegura', () => {
  it('extrai data.mensagem quando disponível', () => {
    const err = { response: { data: { mensagem: 'Erro específico' } } };
    expect(mensagemErroSegura(err)).toBe('Erro específico');
  });

  it('extrai data.erro quando mensagem não existe', () => {
    const err = { response: { data: { erro: 'Erro de validação' } } };
    expect(mensagemErroSegura(err)).toBe('Erro de validação');
  });

  it('retorna fallback padrão quando sem resposta da API', () => {
    expect(mensagemErroSegura(new Error('network error'))).toBe(
      'Ocorreu um erro. Tente novamente.',
    );
  });

  it('retorna fallback customizado', () => {
    expect(mensagemErroSegura({}, 'Falha ao salvar')).toBe('Falha ao salvar');
  });

  it('retorna fallback para erro null', () => {
    expect(mensagemErroSegura(null)).toBe('Ocorreu um erro. Tente novamente.');
  });

  it('prefere mensagem sobre erro quando ambos existem', () => {
    const err = { response: { data: { mensagem: 'msg', erro: 'err' } } };
    expect(mensagemErroSegura(err)).toBe('msg');
  });
});
