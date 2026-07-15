import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Píldora toggle (aria-pressed). Unifica los filtros por tipo, los toggles de
 * capas y los selectores de tipo de campo, que antes replicaban el mismo string
 * `rounded-full border px-2.5 py-1 …` con su propio mapa de tonos.
 */
const chip = cva(
  // Radio moderado y centralizado (--radius-control): coherente con los botones,
  // no una pastilla totalmente redonda. Cambiar el token ajusta todos los controles.
  // Padding compacto para que no compitan en tamaño con los títulos de sección.
  'inline-flex items-center gap-1 rounded-control border px-2 py-0.5 text-xs2 font-bold transition-colors',
  {
    variants: {
      tone: { neutral: '', primary: '', danger: '', warning: '', success: '' },
      active: { true: '', false: 'border-border text-fg-muted hover:text-fg' },
    },
    compoundVariants: [
      { tone: 'neutral', active: true, class: 'border-fg-subtle bg-surface-raised text-fg' },
      { tone: 'primary', active: true, class: 'border-primary bg-primary/15 text-primary' },
      { tone: 'danger', active: true, class: 'border-danger bg-danger/15 text-danger' },
      { tone: 'warning', active: true, class: 'border-warning bg-warning/15 text-warning' },
      { tone: 'success', active: true, class: 'border-success bg-success/15 text-success' },
    ],
    defaultVariants: { tone: 'primary', active: false },
  },
);

interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'>,
    VariantProps<typeof chip> {
  active?: boolean;
}

export function Chip({ tone, active = false, className, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={twMerge(chip({ tone, active }), className)}
      {...rest}
    />
  );
}
