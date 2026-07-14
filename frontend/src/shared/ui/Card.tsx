import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes, PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Superficie con borde y radio de tarjeta — única fuente de la clase
 * `rounded-card border border-border bg-surface[-raised]` que antes se repetía
 * en ~13 vistas. Padding y layout van por `className` (varían por sitio).
 *
 * `glass` la vuelve translúcida con desenfoque (ver .glass-card en index.css);
 * la clase trae su propio border-color, por eso con glass el borde no lleva el
 * color del tema (la utilidad border-border ganaría en la cascada).
 */
const card = cva('rounded-card border', {
  variants: {
    raised: { true: '', false: '' },
    glass: { true: 'glass-card', false: 'border-border' },
  },
  compoundVariants: [
    { glass: false, raised: false, class: 'bg-surface' },
    { glass: false, raised: true, class: 'bg-surface-raised' },
  ],
  defaultVariants: { raised: false, glass: false },
});

interface CardProps
  extends PropsWithChildren,
    VariantProps<typeof card>,
    // Deja pasar atributos del DOM (draggable, onDragStart, title…) al elemento.
    Omit<HTMLAttributes<HTMLElement>, 'color'> {
  as?: 'div' | 'section';
  className?: string;
}

export function Card({ as: Tag = 'div', raised, glass, className, children, ...rest }: CardProps) {
  return (
    <Tag {...rest} className={twMerge(card({ raised, glass }), className)}>
      {children}
    </Tag>
  );
}
