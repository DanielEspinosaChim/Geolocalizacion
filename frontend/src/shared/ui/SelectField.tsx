import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

/** Select nativo con label y error accesibles (los filtros del legacy usan muchos). */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, className = '', children, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">
        {label}
      </label>
      <select
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-control border bg-bg px-3 py-2.5 text-sm text-fg outline-none transition-colors focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
