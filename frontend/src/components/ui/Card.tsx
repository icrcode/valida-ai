import type { HTMLAttributes } from 'react';

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-white/8 bg-[#011140] p-6 shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}
