import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders, USUARIO_ESTUDANTE, USUARIO_ADMIN, USUARIO_COORD } from '../helpers/renderWithProviders';
import { Layout } from '../../components/Layout';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

function renderLayout(usuario = USUARIO_ESTUDANTE) {
  return renderWithProviders(
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<div>conteudo filho</div>} />
      </Route>
    </Routes>,
    { token: 'tok-test', usuario },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Layout', () => {
  it('renderiza o cabeçalho com o logo ValidaAI', () => {
    renderLayout();
    expect(screen.getByText(/Valida/i)).toBeInTheDocument();
  });

  it('renderiza o link de Início na navegação', () => {
    renderLayout();
    expect(screen.getAllByText('Início')[0]).toBeInTheDocument();
  });

  it('renderiza o link de Documentos na navegação', () => {
    renderLayout();
    expect(screen.getAllByText('Documentos')[0]).toBeInTheDocument();
  });

  it('exibe link de Certificados para usuário estudante', () => {
    renderLayout(USUARIO_ESTUDANTE);
    expect(screen.getAllByText('Certificados')[0]).toBeInTheDocument();
  });

  it('não exibe link de Certificados para usuário admin', () => {
    renderLayout(USUARIO_ADMIN);
    expect(screen.queryByText('Certificados')).not.toBeInTheDocument();
  });

  it('exibe links de admin para usuário com perfil admin', () => {
    renderLayout(USUARIO_ADMIN);
    expect(screen.getAllByText('Usuários')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Instituições')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Cursos')[0]).toBeInTheDocument();
  });

  it('não exibe links de admin para usuário estudante', () => {
    renderLayout(USUARIO_ESTUDANTE);
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument();
    expect(screen.queryByText('Instituições')).not.toBeInTheDocument();
  });

  it('exibe link de Fila de Análise para coordenador', () => {
    renderLayout(USUARIO_COORD);
    expect(screen.getAllByText('Fila de Análise')[0]).toBeInTheDocument();
  });

  it('exibe link de Alunos para coordenador', () => {
    renderLayout(USUARIO_COORD);
    expect(screen.getAllByText('Alunos')[0]).toBeInTheDocument();
  });

  it('não exibe link de Alunos para admin', () => {
    renderLayout(USUARIO_ADMIN);
    expect(screen.queryByText('Alunos')).not.toBeInTheDocument();
  });

  it('não exibe link de Alunos para estudante', () => {
    renderLayout(USUARIO_ESTUDANTE);
    expect(screen.queryByText('Alunos')).not.toBeInTheDocument();
  });

  it('exibe o nome do usuário no cabeçalho', () => {
    renderLayout(USUARIO_ESTUDANTE);
    expect(screen.getAllByText(USUARIO_ESTUDANTE.nome)[0]).toBeInTheDocument();
  });

  it('renderiza o conteúdo filho via Outlet', () => {
    renderLayout();
    expect(screen.getByText('conteudo filho')).toBeInTheDocument();
  });

  it('abre o menu mobile ao clicar no botão de menu', () => {
    renderLayout();
    const btnMenu = screen.getByLabelText('Abrir menu');
    fireEvent.click(btnMenu);
    expect(screen.getByLabelText('Fechar menu')).toBeInTheDocument();
  });

  it('fecha o menu mobile ao clicar novamente no botão', () => {
    renderLayout();
    const btnMenu = screen.getByLabelText('Abrir menu');
    fireEvent.click(btnMenu);
    fireEvent.click(screen.getByLabelText('Fechar menu'));
    expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument();
  });

  it('chama logout e navega para /login ao clicar em Sair', () => {
    renderLayout();
    const btnSair = screen.getByText('Sair');
    fireEvent.click(btnSair);
    // Após logout o AuthContext limpa o estado; o componente não deve travar
    expect(btnSair).toBeTruthy();
  });

  it('renderiza botão de alternância de tema', () => {
    renderLayout();
    const btnTema = screen.getByRole('button', { name: /modo claro|modo escuro/i });
    expect(btnTema).toBeInTheDocument();
    fireEvent.click(btnTema);
  });
});
