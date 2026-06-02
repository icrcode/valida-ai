import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeStatus } from '../../components/ui/Badge';

describe('BadgeStatus', () => {
  it('exibe "Pendente" para status pendente', () => {
    render(<BadgeStatus status="pendente" />);
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('exibe "Aprovado" para status aprovado', () => {
    render(<BadgeStatus status="aprovado" />);
    expect(screen.getByText('Aprovado')).toBeInTheDocument();
  });

  it('exibe "Reprovado" para status reprovado', () => {
    render(<BadgeStatus status="reprovado" />);
    expect(screen.getByText('Reprovado')).toBeInTheDocument();
  });

  it('exibe "Cancelado" para status cancelado', () => {
    render(<BadgeStatus status="cancelado" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('exibe "Revisão Solicitada" para status revisao_solicitada', () => {
    render(<BadgeStatus status="revisao_solicitada" />);
    expect(screen.getByText('Revisão Solicitada')).toBeInTheDocument();
  });

  it('aplica cor amber para pendente', () => {
    render(<BadgeStatus status="pendente" />);
    expect(screen.getByText('Pendente')).toHaveClass('text-amber-300');
  });

  it('aplica cor verde para aprovado', () => {
    render(<BadgeStatus status="aprovado" />);
    expect(screen.getByText('Aprovado')).toHaveClass('text-[#7AAA9A]');
  });

  it('aplica cor vermelha para reprovado', () => {
    render(<BadgeStatus status="reprovado" />);
    expect(screen.getByText('Reprovado')).toHaveClass('text-red-400');
  });

  it('aplica cor azul para revisao_solicitada', () => {
    render(<BadgeStatus status="revisao_solicitada" />);
    expect(screen.getByText('Revisão Solicitada')).toHaveClass('text-blue-300');
  });
});
