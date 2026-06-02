import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../contexts/ToastContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { ToastContainer } from '../../components/ToastContainer';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </ThemeProvider>
  );
}

function Disparador() {
  const { addToast, removeToast, toasts } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Sucesso!', 'success')}>success</button>
      <button onClick={() => addToast('Erro!', 'error')}>error</button>
      <button onClick={() => addToast('Info!')}>info</button>
      {toasts.map((t) => (
        <button key={t.id} onClick={() => removeToast(t.id)} data-testid="remover">
          remover {t.id}
        </button>
      ))}
    </div>
  );
}

describe('ToastContainer', () => {
  it('não renderiza nada quando não há toasts', () => {
    render(<Wrapper><div /></Wrapper>);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renderiza toast de sucesso com role alert', async () => {
    render(<Wrapper><Disparador /></Wrapper>);
    await act(async () => { screen.getByText('success').click(); });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
    expect(screen.getByText('Sucesso!')).toBeInTheDocument();
  });

  it('renderiza toast de erro', async () => {
    render(<Wrapper><Disparador /></Wrapper>);
    await act(async () => { screen.getByText('error').click(); });
    expect(screen.getByText('Erro!')).toBeInTheDocument();
  });

  it('renderiza toast de info', async () => {
    render(<Wrapper><Disparador /></Wrapper>);
    await act(async () => { screen.getByText('info').click(); });
    expect(screen.getByText('Info!')).toBeInTheDocument();
  });

  it('remove toast ao clicar no botão Fechar notificação', async () => {
    render(<Wrapper><Disparador /></Wrapper>);
    await act(async () => { screen.getByText('success').click(); });
    expect(screen.getAllByRole('alert').length).toBe(1);
    const btnFechar = screen.getByLabelText('Fechar notificação');
    await act(async () => { btnFechar.click(); });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pode exibir múltiplos toasts simultâneos', async () => {
    render(<Wrapper><Disparador /></Wrapper>);
    await act(async () => { screen.getByText('success').click(); });
    await act(async () => { screen.getByText('error').click(); });
    expect(screen.getAllByRole('alert').length).toBe(2);
  });
});
