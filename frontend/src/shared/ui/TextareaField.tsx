import {
  forwardRef,
  useCallback,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from 'react';

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  /** Filas visibles de partida; crece desde aquí. */
  rows?: number;
  /** A partir de esta altura deja de crecer y aparece su propio scroll. */
  maxRows?: number;
}

/**
 * Área de texto con label y error accesibles — gemelo multilínea de TextField.
 *
 * Crece con el contenido y no muestra la agarradera de redimensionar: obligar a
 * arrastrarla para leer lo que uno acaba de escribir es trabajo del componente,
 * no del usuario. Deja de crecer en `maxRows` y a partir de ahí scrollea.
 */
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField(
    { label, error, className = '', rows = 3, maxRows = 10, value, onChange, ...rest },
    ref,
  ) {
    const id = useId();
    const errorId = `${id}-error`;
    const interno = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => interno.current!, []);

    const ajustar = useCallback(() => {
      const el = interno.current;
      if (!el) return;
      // Reiniciar a `auto` antes de medir: si no, `scrollHeight` nunca baja y
      // el campo no se encoge al borrar texto.
      el.style.height = 'auto';
      const linea = parseFloat(getComputedStyle(el).lineHeight) || 20;
      const relleno = el.offsetHeight - el.clientHeight; // bordes
      const maximo = linea * maxRows + relleno;
      const alto = Math.min(el.scrollHeight + relleno, maximo);
      el.style.height = `${alto}px`;
      el.style.overflowY = el.scrollHeight + relleno > maximo ? 'auto' : 'hidden';
    }, [maxRows]);

    // Reajusta también cuando el valor cambia desde fuera (un reset del form).
    useLayoutEffect(ajustar, [ajustar, value]);

    return (
      <div className="grid gap-1.5">
        <label htmlFor={id} className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
          {label}
        </label>
        <textarea
          ref={interno}
          id={id}
          rows={rows}
          value={value}
          onChange={(e) => {
            ajustar();
            onChange?.(e);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`scrollbar-slim w-full resize-none rounded-control border bg-bg px-3.5 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-primary ${error ? 'border-danger' : 'border-border'} ${className}`}
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
