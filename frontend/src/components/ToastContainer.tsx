import { useToast, type ToastTipo } from '../contexts/ToastContext';

const ESTILOS: Record<ToastTipo, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
};

const ICONES: Record<ToastTipo, string> = {
  success: '✓',
  error: '✕',
  info: 'i',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg animate-in ${ESTILOS[toast.tipo]}`}
        >
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
            {ICONES[toast.tipo]}
          </span>
          <p className="flex-1 text-sm font-medium leading-snug">{toast.mensagem}</p>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Fechar"
            className="flex-shrink-0 opacity-70 hover:opacity-100 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
