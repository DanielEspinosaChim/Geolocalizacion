import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchInput } from './SearchInput';

interface SearchComboboxProps<T> {
  /** Universo a filtrar. El filtrado es en cliente sobre `getLabel`. */
  items: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  /** Segunda línea de cada resultado (giro, colonia, dirección…). */
  getHint?: (item: T) => string | undefined;
  onSelect: (item: T) => void;
  placeholder?: string;
  'aria-label': string;
  /** Corta la lista para no pintar miles de nodos. */
  maxResults?: number;
  className?: string;
}

/** Filtra por subcadena y corta en `maxResults` sin recorrer el resto del universo. */
function useResultados<T>(
  items: readonly T[],
  q: string,
  getLabel: (item: T) => string,
  maxResults: number,
): T[] {
  return useMemo(() => {
    const texto = q.trim().toLowerCase();
    if (texto.length < 2) return [];
    const out: T[] = [];
    for (const item of items) {
      if (getLabel(item).toLowerCase().includes(texto)) out.push(item);
      if (out.length === maxResults) break;
    }
    return out;
  }, [items, q, getLabel, maxResults]);
}

/** Cierra el desplegable al hacer clic fuera: flota sobre el mapa y estorbaría. */
function useCerrarAlClicFuera(ref: React.RefObject<HTMLElement | null>, cerrar: () => void) {
  useEffect(() => {
    function fuera(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) cerrar();
    }
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [ref, cerrar]);
}

/**
 * Buscador con desplegable de resultados, navegable por teclado (↑ ↓ Enter Esc).
 * Es agnóstico al dominio: recibe los items ya cargados y cómo leerlos, así que
 * el mismo componente sirve para negocios en el mapa, en rutas y en campañas.
 */
export function SearchCombobox<T>({
  items,
  getKey,
  getLabel,
  getHint,
  onSelect,
  placeholder = 'Buscar…',
  maxResults = 8,
  className = '',
  ...aria
}: SearchComboboxProps<T>) {
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);

  const resultados = useResultados(items, q, getLabel, maxResults);
  useEffect(() => setActivo(0), [q]);
  useCerrarAlClicFuera(contenedor, () => setQ(''));

  function elegir(item: T) {
    onSelect(item);
    setQ('');
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!resultados.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((i) => (i + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = resultados[activo];
      if (item) elegir(item);
    } else if (e.key === 'Escape') {
      setQ('');
    }
  }

  return (
    <div ref={contenedor} className={`relative ${className}`}>
      <SearchInput
        value={q}
        onChange={setQ}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        {...aria}
      />
      {resultados.length ? (
        <ul
          aria-label={aria['aria-label']}
          className="absolute left-0 right-0 top-full z-panel mt-1 max-h-72 overflow-y-auto rounded-card border border-border bg-surface shadow-overlay"
        >
          {resultados.map((item, i) => (
            <li key={getKey(item)}>
              <button
                type="button"
                aria-current={i === activo}
                onPointerEnter={() => setActivo(i)}
                onClick={() => elegir(item)}
                className={`block w-full px-3 py-2 text-left transition-colors ${
                  i === activo ? 'bg-surface-raised' : ''
                }`}
              >
                <span className="block truncate text-xs font-semibold text-fg">
                  {getLabel(item)}
                </span>
                {getHint?.(item) ? (
                  <span className="block truncate text-2xs text-fg-subtle">{getHint(item)}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
