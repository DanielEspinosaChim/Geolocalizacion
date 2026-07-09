import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';
import { Spinner } from './Spinner';

/**
 * Variantes con CVA: `variant`, `size`, `full` y `loading` son props tipadas.
 * El `className` externo se fusiona con twMerge, así un override puntual de
 * layout (mt-2, flex-1) no colisiona con las clases base. Los hacks de tamaño
 * (`px-2 py-1 text-[11px]`) y de tono (`ghost + text-danger`) ya no van en
 * className: son `size`/`variant`.
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-control font-bold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary-strong text-primary-fg shadow-lg shadow-primary/25 hover:bg-primary',
        secondary: 'border border-border bg-surface-raised text-fg hover:border-fg-subtle',
        outline: 'border border-border bg-transparent text-fg hover:bg-surface-raised',
        ghost: 'text-fg-muted hover:text-fg',
        danger: 'bg-danger text-white hover:bg-danger/90',
      },
      size: {
        sm: 'px-2.5 py-1 text-xs2',
        md: 'px-4 py-2.5 text-sm',
      },
      full: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  /** Muestra spinner y deshabilita el botón mientras dura la acción. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  full,
  loading = false,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={twMerge(button({ variant, size, full }), className)}
    >
      {loading ? <Spinner className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
