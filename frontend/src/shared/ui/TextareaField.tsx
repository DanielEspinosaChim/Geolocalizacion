import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

/** Área de texto con label y error accesibles — gemelo multilínea de TextField. */
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, error, className = '', rows = 3, ...rest }, ref) {
    const id = useId();
    const errorId = `${id}-error`;
    return (
      <div className="grid gap-1.5">
        <label htmlFor={id} className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
          {label}
        </label>
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full resize-y rounded-control border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
          {...rest}
        />
        {error ? (
          <p id={errorId} className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
