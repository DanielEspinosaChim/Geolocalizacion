import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary-strong text-primary-fg shadow-lg shadow-primary/25 hover:bg-primary disabled:opacity-60',
  secondary:
    'border border-border bg-surface-raised text-fg hover:border-fg-subtle disabled:opacity-60',
  ghost: 'text-fg-muted hover:text-fg disabled:opacity-60',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  full?: boolean;
}

export function Button({ variant = 'primary', full, className = '', ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${full ? 'w-full' : ''} ${className}`}
    />
  );
}
