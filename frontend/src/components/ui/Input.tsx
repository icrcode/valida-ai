import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-white/70">
          {label}
        </label>
      )}
      <input
        id={id}
        {...props}
        className={`rounded-lg border bg-[#011640] px-3 py-2 text-sm text-white placeholder:text-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[#618C7C] focus:border-[#618C7C]/50 ${
          error ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
        } ${className}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
