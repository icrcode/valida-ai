import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../contexts/ToastContext';

function Probe() {
  const { toasts, addToast, removeToast } = useToast();
  return (
    <div>
      <span data-testid="count">{toasts.length}</span>
      {toasts.map((t) => (
        <div key={t.id} data-testid="toast" data-tipo={t.tipo}>
          {t.mensagem}
          <button onClick={() => removeToast(t.id)}>fechar</button>
        </div>
      ))}
      <button onClick={() => addToast('Salvo!', 'success')}>success</button>
      <button onClick={() => addToast('Erro!', 'error')}>error</button>
      <button onClick={() => addToast('Aviso')}>info</button>
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe('ToastContext', () => {
  it('inicia sem toasts', () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('adiciona toast de sucesso', async () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    await act(async () => { screen.getByText('success').click(); });
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByText('Salvo!')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveAttribute('data-tipo', 'success');
  });

  it('adiciona toast de erro', async () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    await act(async () => { screen.getByText('error').click(); });
    expect(screen.getByTestId('toast')).toHaveAttribute('data-tipo', 'error');
  });

  it('usa tipo info por padrão', async () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    await act(async () => { screen.getByText('info').click(); });
    expect(screen.getByTestId('toast')).toHaveAttribute('data-tipo', 'info');
  });

  it('remove toast ao clicar em fechar', async () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    await act(async () => { screen.getByText('success').click(); });
    expect(screen.getByTestId('count').textContent).toBe('1');
    await act(async () => { screen.getByText('fechar').click(); });
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('remove toast automaticamente após 4500ms', async () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    await act(async () => { screen.getByText('success').click(); });
    expect(screen.getByTestId('count').textContent).toBe('1');
    await act(async () => { vi.advanceTimersByTime(4500); });
    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('lança erro quando useToast é usado fora do ToastProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => render(<Probe />)).toThrow('useToast deve ser usado dentro de ToastProvider');
    console.error = consoleError;
  });
});
