/**
 * Smoke tests para páginas — verifica que renderizam sem erros
 * Cobre os caminhos iniciais de render (loading states, estrutura básica)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, USUARIO_ESTUDANTE, USUARIO_ADMIN, USUARIO_COORD } from '../helpers/renderWithProviders';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import { Documentos } from '../../pages/Documentos';
import { Perfil } from '../../pages/Perfil';
import { MeusCertificados } from '../../pages/MeusCertificados';
import { Usuarios } from '../../pages/Usuarios';
import { Cursos } from '../../pages/Cursos';
import { Instituicoes } from '../../pages/Instituicoes';
import { Cadastro } from '../../pages/Cadastro';
import { SubmeterDocumento } from '../../pages/SubmeterDocumento';

beforeEach(() => vi.clearAllMocks());

describe('Documentos page', () => {
  it('renderiza sem erros para estudante', () => {
    const { container } = renderWithProviders(<Documentos />, {
      token: 'tok-123', usuario: USUARIO_ESTUDANTE,
    });
    expect(container).toBeTruthy();
  });

  it('renderiza sem erros para coordenador', () => {
    const { container } = renderWithProviders(<Documentos />, {
      token: 'tok-123', usuario: USUARIO_COORD,
    });
    expect(container).toBeTruthy();
  });
});

describe('Perfil page', () => {
  it('renderiza sem erros', () => {
    const { container } = renderWithProviders(<Perfil />, {
      token: 'tok-123', usuario: USUARIO_ESTUDANTE,
    });
    expect(container).toBeTruthy();
  });
});

describe('MeusCertificados page', () => {
  it('renderiza sem erros', () => {
    const { container } = renderWithProviders(<MeusCertificados />, {
      token: 'tok-123', usuario: USUARIO_ESTUDANTE,
    });
    expect(container).toBeTruthy();
  });
});

describe('Usuarios page', () => {
  it('renderiza sem erros para admin', () => {
    const { container } = renderWithProviders(<Usuarios />, {
      token: 'tok-123', usuario: USUARIO_ADMIN,
    });
    expect(container).toBeTruthy();
  });
});

describe('Cursos page', () => {
  it('renderiza sem erros para admin', () => {
    const { container } = renderWithProviders(<Cursos />, {
      token: 'tok-123', usuario: USUARIO_ADMIN,
    });
    expect(container).toBeTruthy();
  });
});

describe('Instituicoes page', () => {
  it('renderiza sem erros para admin', () => {
    const { container } = renderWithProviders(<Instituicoes />, {
      token: 'tok-123', usuario: USUARIO_ADMIN,
    });
    expect(container).toBeTruthy();
  });
});

describe('Cadastro page', () => {
  it('renderiza sem erros', () => {
    const { container } = renderWithProviders(<Cadastro />);
    expect(container).toBeTruthy();
  });

  it('exibe campo de nome', () => {
    renderWithProviders(<Cadastro />);
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it('exibe campo de e-mail', () => {
    renderWithProviders(<Cadastro />);
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
  });
});

describe('SubmeterDocumento page', () => {
  it('renderiza sem erros para estudante', () => {
    const { container } = renderWithProviders(<SubmeterDocumento />, {
      token: 'tok-123', usuario: USUARIO_ESTUDANTE,
    });
    expect(container).toBeTruthy();
  });
});
