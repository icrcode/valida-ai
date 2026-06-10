import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const TAMANHOS = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const;

interface ModalProps {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
  tamanho?: keyof typeof TAMANHOS;
}

export function Modal({ titulo, onClose, children, tamanho = 'md' }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/50"
      role="button"
      tabIndex={-1}
      aria-label="Fechar modal"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onClose(); }}
    >
      <div className="flex min-h-full items-start justify-center px-4 py-8">
        <div
          className={`w-full ${TAMANHOS[tamanho]} rounded-2xl bg-[#011140] shadow-xl flex flex-col`}
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-6 py-4">
            <h2 className="text-base font-semibold text-white">{titulo}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/45 hover:bg-white/6 hover:text-white/70"
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
