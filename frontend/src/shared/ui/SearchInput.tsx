import { Search, X } from 'lucide-react';
import { useEffect, useState, type InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  /** ms de debounce antes de propagar el cambio (0 = inmediato). */
  debounceMs?: number;
  'aria-label': string;
}

/** Input de búsqueda con icono, botón de limpiar y debounce opcional. */
export function SearchInput({
  value,
  onChange,
  debounceMs = 0,
  className = '',
  ...rest
}: SearchInputProps) {
  const [text, setText] = useState(value);

  // Sincroniza cuando el valor externo cambia por fuera del input (ej. reset).
  useEffect(() => setText(value), [value]);

  // Propaga el cambio con debounce; el guard evita re-disparos y bucles.
  useEffect(() => {
    if (text === value) return;
    const id = setTimeout(() => onChange(text), debounceMs);
    return () => clearTimeout(id);
  }, [text, value, debounceMs, onChange]);

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden="true"
      />
      <input
        {...rest}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        // Píldora gris que pasa a blanco con borde de marca al enfocar — el
        // patrón del buscador de Google Maps, en pill para todo el sistema.
        // twMerge permite variantes por sitio (el buscador flotante del mapa
        // trae su propia superficie) sin pelear con la cascada.
        className={twMerge(
          'w-full rounded-full border border-transparent bg-surface-raised py-2 pl-8 pr-8 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-primary focus:bg-surface',
          className,
        )}
      />
      {text ? (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => setText('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-fg-subtle transition-colors hover:text-fg"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
