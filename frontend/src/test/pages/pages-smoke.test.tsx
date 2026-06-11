import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('páginas autenticadas — smoke', () => {
  it.each([
    ['Documentos (estudante)', Documentos, USUARIO_ESTUDANTE],
    ['Documentos (coordenador)', Documentos, USUARIO_COORD],
    ['Perfil', Perfil, USUARIO_ESTUDANTE],
    ['MeusCertificados', MeusCertificados, USUARIO_ESTUDANTE],
    ['Usuarios', Usuarios, USUARIO_ADMIN],
    ['Cursos', Cursos, USUARIO_ADMIN],
    ['Instituicoes', Instituicoes, USUARIO_ADMIN],
    ['SubmeterDocumento', SubmeterDocumento, USUARIO_ESTUDANTE],
  ] as const)('renderiza %s sem erros', (_nome, Componente, usuario) => {
    const { container } = renderWithProviders(
      <Componente />,
      { token: 'tok-123', usuario },
    );
    expect(container).toBeTruthy();
  });
});

describe('Cadastro page', () => {
  it('renderiza sem erros', () => {
    const { container } = renderWithProviders(<Cadastro />);
    expect(container).toBeTruthy();
  });

  it('exibe campo de nome na etapa 1', () => {
    renderWithProviders(<Cadastro />);
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  it('avança para a etapa de dados acadêmicos ao informar o nome', async () => {
    renderWithProviders(<Cadastro />);
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Nome Válido' } });
    fireEvent.click(screen.getByText('Continuar'));
    await waitFor(() => expect(screen.getByLabelText(/universidade/i)).toBeInTheDocument());
  });
});
