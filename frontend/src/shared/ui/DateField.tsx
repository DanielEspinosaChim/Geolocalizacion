import { forwardRef, useId, type InputHTMLAttributes } from 'react';

const TAMANOS = {
  sm: 'px-2.5 py-1 text-xs2',
  md: 'px-3.5 py-2.5 text-sm',
} as const;

interface DateFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Vacío = sin rótulo visible; entonces hay que pasar `aria-label`. */
  label?: string;
  error?: string;
  /** `sm` para celdas de tabla. */
  size?: keyof typeof TAMANOS;
}

/**
 * Campo de fecha con el aspecto del tema.
 *
 * El selector nativo del navegador no se puede tematizar, pero el icono del
 * calendario sí: `invert` lo pasa de negro a blanco para que se vea sobre la
 * superficie oscura (en tema claro se anula). Es el único retoque necesario.
 */
export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(function DateField(
  { label = '', error, size = 'md', className = '', ...rest },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={id}
        type="date"
        // Clic en cualquier parte del campo abre el calendario, no solo el
        // iconito. Sin esto, pulsar sobre el texto no hace nada y parece roto.
        // El try/catch cubre navegadores que bloquean showPicker fuera de un
        // gesto del usuario o que no lo implementan.
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            /* el navegador lo rechazó; el clic normal sigue funcionando */
          }
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-control border bg-bg text-fg outline-none transition-colors focus:border-primary [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-100 [[data-theme=light]_&::-webkit-calendar-picker-indicator]:invert-0 ${
          error ? 'border-danger' : 'border-border'
        } ${TAMANOS[size]} ${className}`}
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
