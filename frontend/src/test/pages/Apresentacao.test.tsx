import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { Apresentacao } from '../../pages/Apresentacao';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
});

function renderPage() {
  return renderWithProviders(<Apresentacao />);
}

describe('Apresentacao', () => {
  it('renderiza sem erros', () => {
    const { container } = renderPage();
    expect(container).toBeTruthy();
  });

  it('exibe o logo ValidaAI', () => {
    renderPage();
    const logos = screen.getAllByText(/ValidaAI/i);
    expect(logos.length).toBeGreaterThan(0);
  });

  it('exibe o título principal do hero', () => {
    renderPage();
    expect(screen.getByText(/centralize e valide os/i)).toBeInTheDocument();
    expect(screen.getByText(/certificados acadêmicos/i)).toBeInTheDocument();
  });

  it('exibe o badge de plataforma', () => {
    renderPage();
    expect(screen.getByText(/plataforma de validação acadêmica/i)).toBeInTheDocument();
  });

  it('exibe o CTA "Começar agora"', () => {
    renderPage();
    const links = screen.getAllByRole('link', { name: /começar agora/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('exibe o link "Já tenho uma conta"', () => {
    renderPage();
    const links = screen.getAllByRole('link', { name: /já tenho uma conta/i });
    expect(links.length).toBeGreaterThan(0);
  });

  it('exibe os stats do hero', () => {
    renderPage();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.getByText('24/7')).toBeInTheDocument();
  });

  it('exibe os labels dos stats', () => {
    renderPage();
    expect(screen.getByText('Digital')).toBeInTheDocument();
    expect(screen.getByText('Verificável')).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
  });

  // Navbar
  it('exibe os itens de navegação no desktop', () => {
    renderPage();
    expect(screen.getAllByText('Início').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Funcionalidades').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Benefícios').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Segurança').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Contato').length).toBeGreaterThan(0);
  });

  it('exibe os botões Entrar e Criar conta na navbar', () => {
    renderPage();
    expect(screen.getAllByText('Entrar')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Criar conta')[0]).toBeInTheDocument();
  });

  it('abre o menu mobile ao clicar no hamburger', () => {
    renderPage();
    const hamburgers = screen.getAllByRole('button');
    const hamburger = hamburgers.find((b) => b.querySelector('path[d*="3.75 6.75"]'));
    expect(hamburger).toBeTruthy();
    fireEvent.click(hamburger!);
    // Após abrir, o botão muda para o X (close icon)
    const closeBtn = screen.getAllByRole('button').find((b) => b.querySelector('path[d*="M6 18"]'));
    expect(closeBtn).toBeTruthy();
  });

  // Seção "Como funciona"
  it('exibe as 4 etapas do fluxo', () => {
    renderPage();
    expect(screen.getByText('Cadastre-se')).toBeInTheDocument();
    expect(screen.getByText('Envie')).toBeInTheDocument();
    expect(screen.getByText('Validação')).toBeInTheDocument();
    expect(screen.getByText('Compartilhe')).toBeInTheDocument();
  });

  it('exibe os números das etapas', () => {
    renderPage();
    expect(screen.getAllByText('01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('02').length).toBeGreaterThan(0);
    expect(screen.getAllByText('03').length).toBeGreaterThan(0);
    expect(screen.getAllByText('04').length).toBeGreaterThan(0);
  });

  // Seção Funcionalidades
  it('exibe os cards de funcionalidades', () => {
    renderPage();
    expect(screen.getByText('Envio de Certificados')).toBeInTheDocument();
    expect(screen.getByText('Validação por Coordenadores')).toBeInTheDocument();
    expect(screen.getByText('Verificação Pública')).toBeInTheDocument();
    expect(screen.getByText('Multi-Instituição')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Inteligente')).toBeInTheDocument();
    expect(screen.getByText('Geração de Certificados')).toBeInTheDocument();
  });

  // Seção Benefícios
  it('exibe os três perfis de benefícios', () => {
    renderPage();
    expect(screen.getByText('Para Estudantes')).toBeInTheDocument();
    expect(screen.getByText('Para Coordenadores')).toBeInTheDocument();
    expect(screen.getByText('Para Instituições')).toBeInTheDocument();
  });

  it('exibe os itens de benefícios dos estudantes', () => {
    renderPage();
    expect(screen.getByText(/envie certificados de qualquer lugar/i)).toBeInTheDocument();
    expect(screen.getByText(/acompanhe o status/i)).toBeInTheDocument();
  });

  // Seção Segurança
  it('exibe os cards de segurança', () => {
    renderPage();
    expect(screen.getByText('Criptografia TLS 1.2/1.3')).toBeInTheDocument();
    expect(screen.getByText('Autenticação Segura')).toBeInTheDocument();
    expect(screen.getByText('Controle de Acesso')).toBeInTheDocument();
    expect(screen.getByText('QR Code Verificável')).toBeInTheDocument();
    expect(screen.getByText('Headers de Segurança')).toBeInTheDocument();
    expect(screen.getByText('Armazenamento S3')).toBeInTheDocument();
  });

  // Seção Contato
  it('exibe a seção de contato com menção ao TCC', () => {
    renderPage();
    const tccTexts = screen.getAllByText(/trabalho de conclusão de curso/i);
    expect(tccTexts.length).toBeGreaterThan(0);
  });

  it('exibe o link para o GitHub', () => {
    renderPage();
    const ghLink = screen.getByRole('link', { name: /github\.com\/icrcode/i });
    expect(ghLink).toBeInTheDocument();
    expect(ghLink).toHaveAttribute('href', 'https://github.com/icrcode');
    expect(ghLink).toHaveAttribute('target', '_blank');
  });

  // Footer
  it('exibe o footer com copyright', () => {
    renderPage();
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('exibe links de navegação no footer', () => {
    renderPage();
    // Footer duplica os nav items
    const inicioButtons = screen.getAllByText('Início');
    expect(inicioButtons.length).toBeGreaterThanOrEqual(2);
  });

  // Seções heading
  it('exibe os headings das seções', () => {
    renderPage();
    expect(screen.getByText('Tudo que você precisa em um só lugar')).toBeInTheDocument();
    expect(screen.getByText('Vantagens para cada perfil')).toBeInTheDocument();
    expect(screen.getByText('Seus dados estão protegidos')).toBeInTheDocument();
    expect(screen.getAllByText('Entre em contato').length).toBeGreaterThan(0);
  });

  // Redirect
  it('redireciona para /dashboard quando autenticado', () => {
    renderWithProviders(<Apresentacao />, {
      token: 'tok-test',
      usuario: {
        id: 'u-1', nome: 'Teste', email: 'teste@test.com', perfil: 'estudante',
        matricula: '2021001', cpf: null, endereco: null, curso_id: 'c-1',
        instituicao_id: 'i-1', instituicao_nome: 'Universidade Teste', ativo: true,
      },
    });
    expect(screen.queryByText(/plataforma de validação acadêmica/i)).not.toBeInTheDocument();
  });

  // Elementos gráficos
  it('renderiza o grid pattern SVG', () => {
    const { container } = renderPage();
    const patterns = container.querySelectorAll('pattern#grid');
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('renderiza as formas flutuantes', () => {
    const { container } = renderPage();
    const floats = container.querySelectorAll('.landing-float-slow, .landing-float-med, .landing-float-fast');
    expect(floats.length).toBeGreaterThan(0);
  });

  it('renderiza os dividers entre seções', () => {
    const { container } = renderPage();
    // Dividers have the gradient line + dot pattern
    const dots = container.querySelectorAll('.rounded-full.bg-\\[\\#618C7C\\]\\/25');
    expect(dots.length).toBeGreaterThan(0);
  });
});
