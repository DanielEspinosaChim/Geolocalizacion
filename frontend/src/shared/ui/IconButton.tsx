import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

const iconButton = cva(
  'inline-flex shrink-0 items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        ghost: 'text-fg-muted hover:bg-surface-raised hover:text-fg',
        danger: 'text-danger hover:bg-danger/10',
        primary: 'bg-primary-strong text-primary-fg hover:bg-primary',
      },
      size: { sm: 'h-7 w-7', md: 'h-9 w-9' },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    VariantProps<typeof iconButton> {
  /** Obligatorio: se usa como aria-label y title (a11y en botones de solo icono). */
  label: string;
  icon: LucideIcon;
}

/** Botón de solo icono con área táctil y aria-label garantizados. */
export function IconButton({
  label,
  icon: Icon,
  variant,
  size,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={twMerge(iconButton({ variant, size }), className)}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
    </button>
  );
}
