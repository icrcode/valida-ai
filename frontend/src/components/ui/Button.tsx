import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'danger' | 'secondary' | 'ghost';

const variants: Record<Variant, string> = {
  primary:
    'bg-[#618C7C] text-white hover:bg-[#7AAA9A] active:bg-[#4D7365] shadow-sm hover:shadow-[0_0_24px_rgba(97,140,124,0.3)] disabled:opacity-40 disabled:hover:bg-[#618C7C] disabled:hover:shadow-none',
  danger:
    'bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 hover:text-red-300 disabled:opacity-40',
  secondary:
    'bg-white/5 text-white/75 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 disabled:opacity-40',
  ghost:
    'bg-transparent text-white/55 hover:bg-white/5 hover:text-white/90 disabled:opacity-40',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#618C7C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#010A26] ${variants[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
