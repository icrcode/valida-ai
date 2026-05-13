import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ToastTipo = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  mensagem: string;
  tipo: ToastTipo;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (mensagem: string, tipo?: ToastTipo) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (mensagem: string, tipo: ToastTipo = 'info') => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, mensagem, tipo }]);
      setTimeout(() => removeToast(id), 4500);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
