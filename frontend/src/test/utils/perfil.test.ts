import { describe, it, expect } from 'vitest';
import { iniciais, PERFIL_LABEL, PERFIL_COR } from '../../utils/perfil';

describe('iniciais', () => {
  it('retorna as duas primeiras iniciais de um nome completo', () => {
    expect(iniciais('João Silva')).toBe('JS');
  });

  it('retorna apenas uma inicial quando o nome tem uma palavra', () => {
    expect(iniciais('João')).toBe('J');
  });

  it('retorna em maiúsculo', () => {
    expect(iniciais('ana paula')).toBe('AP');
  });

  it('ignora espaços extras', () => {
    expect(iniciais('  Maria  Oliveira  ')).toBe('MO');
  });

  it('limita a duas iniciais mesmo com nome longo', () => {
    expect(iniciais('José da Silva Sauro')).toBe('JD');
  });

  it('retorna string vazia para string vazia', () => {
    expect(iniciais('')).toBe('');
  });
});

describe('PERFIL_LABEL', () => {
  it('retorna label correto para estudante', () => {
    expect(PERFIL_LABEL['estudante']).toBe('Estudante');
  });

  it('retorna label correto para coordenador', () => {
    expect(PERFIL_LABEL['coordenador']).toBe('Coordenador');
  });

  it('retorna label correto para admin', () => {
    expect(PERFIL_LABEL['admin']).toBe('Administrador');
  });
});

describe('PERFIL_COR', () => {
  it('possui classes para estudante', () => {
    expect(PERFIL_COR['estudante']).toBeTruthy();
  });

  it('possui classes para coordenador', () => {
    expect(PERFIL_COR['coordenador']).toContain('purple');
  });

  it('possui classes para admin', () => {
    expect(PERFIL_COR['admin']).toContain('amber');
  });
});
