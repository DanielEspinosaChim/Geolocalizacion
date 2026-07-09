import type { InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

/** Checkbox nativo con el color de marca (accent-primary) y radio del tema. */
export function Checkbox({ className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={twMerge('h-4 w-4 rounded border-border accent-primary', className)}
      {...rest}
    />
  );
}
