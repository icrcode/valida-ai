import { useToast, type ToastTipo } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { CheckIcon, CloseIcon, InfoIcon } from './icons';

const ESTILOS: Record<ToastTipo, string> = {
  success: 'border-[#618C7C]/40',
  error:   'border-red-500/40',
  info:    'border-blue-500/40',
};

const ICONE_ESTILOS: Record<ToastTipo, string> = {
  success: 'bg-[#618C7C] text-[#ffffff]',
  error:   'bg-red-500 text-[#ffffff]',
  info:    'bg-blue-500 text-[#ffffff]',
};

const ICONE_COMPONENTE: Record<ToastTipo, React.ReactNode> = {
  success: <CheckIcon className="h-3 w-3" />,
  error:   <CloseIcon className="h-3 w-3" />,
  info:    <InfoIcon  className="h-3 w-3" />,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const { tema } = useTheme();

  if (toasts.length === 0) return null;

  const bgToast = tema === 'light'
    ? 'rgba(255, 255, 255, 0.95)'
    : 'rgba(1, 17, 64, 0.92)';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          style={{ background: bgToast, backdropFilter: 'blur(12px)' }}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl animate-slide-in ${ESTILOS[toast.tipo]}`}
        >
          <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${ICONE_ESTILOS[toast.tipo]}`}
            aria-hidden="true">
            {ICONE_COMPONENTE[toast.tipo]}
          </span>
          <p className="flex-1 text-sm font-medium leading-snug text-white/90">{toast.mensagem}</p>
          <button
            onClick={() => removeToast(toast.id)}
            aria-label="Fechar notificação"
            className="flex-shrink-0 text-white/40 hover:text-white/90 transition-colors"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
