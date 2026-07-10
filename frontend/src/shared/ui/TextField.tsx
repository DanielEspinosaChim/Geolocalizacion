import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/** Campo de texto con label y mensaje de error accesibles (aria-*). */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, className = '', ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-control border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
