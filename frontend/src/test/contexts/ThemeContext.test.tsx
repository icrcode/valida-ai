import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

function Probe() {
  const { tema, alternar } = useTheme();
  return (
    <div>
      <span data-testid="tema">{tema}</span>
      <button onClick={alternar}>alternar</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('light');
});

describe('ThemeContext', () => {
  it('inicia com tema dark por padrão', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('tema').textContent).toBe('dark');
  });

  it('inicia com tema salvo no localStorage', () => {
    localStorage.setItem('tema', 'light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('tema').textContent).toBe('light');
  });

  it('alterna de dark para light ao clicar', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expect(screen.getByTestId('tema').textContent).toBe('dark');
    await act(async () => { screen.getByText('alternar').click(); });
    expect(screen.getByTestId('tema').textContent).toBe('light');
    expect(localStorage.getItem('tema')).toBe('light');
  });

  it('alterna de light para dark ao clicar novamente', async () => {
    document.documentElement.classList.add('light');
    localStorage.setItem('tema', 'light');
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => { screen.getByText('alternar').click(); });
    expect(screen.getByTestId('tema').textContent).toBe('dark');
  });

  it('salva o tema no localStorage ao alternar', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);
    await act(async () => { screen.getByText('alternar').click(); });
    expect(localStorage.getItem('tema')).toBe('light');
  });
});
