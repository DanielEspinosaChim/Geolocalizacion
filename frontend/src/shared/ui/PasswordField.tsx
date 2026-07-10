import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

/**
 * Campo de contraseña con botón para mostrar/ocultar el texto.
 *
 * Gemelo de TextField; solo añade el ojo. Alternar entre `password` y `text`
 * deja al navegador seguir ofreciendo el autocompletado de contraseñas.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, className = '', ...rest }, ref) {
    const id = useId();
    const errorId = `${id}-error`;
    const [visible, setVisible] = useState(false);
    const Icono = visible ? EyeOff : Eye;

    return (
      <div className="grid gap-1.5">
        <label htmlFor={id} className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            // `sin-ojo-nativo` esconde el ojo que Edge y Chrome pintan por su
            // cuenta encima del nuestro: dos ojos superpuestos parpadeaban al
            // pasar el ratón, porque el del navegador aparece y desaparece solo.
            className={`sin-ojo-nativo w-full rounded-control border bg-bg px-3.5 py-2.5 pr-10 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
            {...rest}
          />
          <button
            type="button"
            // No entra en el tab: el campo es lo importante. `tabIndex={-1}`.
            tabIndex={-1}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            // Color fijo, sin hover: el ojo se ve igual siempre.
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-control p-1.5 text-fg-muted"
          >
            <Icono className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {error ? (
          <p id={errorId} className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
