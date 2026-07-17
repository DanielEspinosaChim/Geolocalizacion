import { ChevronDown } from 'lucide-react';
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Vacío = sin rótulo visible; en ese caso hay que pasar `aria-label`. */
  label: string;
  error?: string;
}

/**
 * Select nativo con label y error accesibles (los filtros del legacy usan
 * muchos), pero con el mismo aspecto que el resto de campos: `appearance-none`
 * quita la flecha del sistema operativo (rompía el formato — cada navegador la
 * dibuja distinto) y se reemplaza por el mismo `ChevronDown` del Combobox.
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, className = '', children, ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      {/* Un <label> vacío es peor que ninguno: el lector de pantalla anuncia un
          rótulo en blanco. Si el contexto ya nombra el campo (el título de la
          sección), se omite y el nombre accesible llega por `aria-label`. */}
      {label ? (
        <label htmlFor={id} className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full appearance-none rounded-control border bg-bg px-3 py-2.5 pr-9 text-sm text-fg outline-none transition-colors focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
