import { useToast, type ToastTipo } from '../contexts/ToastContext';

const ESTILOS: Record<ToastTipo, string> = {
  success: 'border-[#618C7C]/40',
  error:   'border-red-500/40',
  info:    'border-blue-500/40',
};

const ICONE_ESTILOS: Record<ToastTipo, string> = {
  success: 'bg-[#618C7C] text-white',
  error:   'bg-red-500 text-white',
  info:    'bg-blue-500 text-white',
};

const ICONES: Record<ToastTipo, string> = {
  success: '✓',
  error:   '✕',
  info:    'i',
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
          style={{ background: 'rgba(1, 17, 64, 0.92)', backdropFilter: 'blur(12px)' }}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl animate-slide-in ${ESTILOS[toast.tipo]}`}
        >
          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${ICONE_ESTILOS[toast.tipo]}`}>
            {ICONES[toast.tipo]}
          </span>
          <p className="flex-1 text-sm font-medium leading-snug text-white/90">{toast.mensagem}</p>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Fechar"
            className="flex-shrink-0 text-lg leading-none text-white/40 hover:text-white/90 transition-colors"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
