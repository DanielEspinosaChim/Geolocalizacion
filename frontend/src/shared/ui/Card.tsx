import { cva, type VariantProps } from 'class-variance-authority';
import type { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Superficie con borde y radio de tarjeta — única fuente de la clase
 * `rounded-card border border-border bg-surface[-raised]` que antes se repetía
 * en ~13 vistas. Padding y layout van por `className` (varían por sitio).
 */
const card = cva('rounded-card border border-border', {
  variants: {
    raised: { true: 'bg-surface-raised', false: 'bg-surface' },
  },
  defaultVariants: { raised: false },
});

interface CardProps extends PropsWithChildren, VariantProps<typeof card> {
  as?: 'div' | 'section';
  className?: string;
}

export function Card({ as: Tag = 'div', raised, className, children }: CardProps) {
  return <Tag className={twMerge(card({ raised }), className)}>{children}</Tag>;
}
