import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../../components/ui/Button';

describe('Button', () => {
  it('renderiza o texto filho', () => {
    render(<Button>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('aplica variant primary por padrão', () => {
    render(<Button>OK</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[#618C7C]');
  });

  it('aplica variant danger', () => {
    render(<Button variant="danger">Excluir</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-red-400');
  });

  it('aplica variant secondary', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-white/5');
  });

  it('aplica variant ghost', () => {
    render(<Button variant="ghost">Ver</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('fica desabilitado quando disabled=true', () => {
    render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('fica desabilitado quando loading=true', () => {
    render(<Button loading>Carregando</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('exibe spinner quando loading=true', () => {
    render(<Button loading>Aguarde</Button>);
    expect(screen.getByRole('button').querySelector('svg, .animate-spin, [class*="spin"]')).toBeTruthy();
  });

  it('aceita className adicional', () => {
    render(<Button className="w-full">Largo</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });
});
