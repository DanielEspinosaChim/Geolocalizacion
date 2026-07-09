import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ComboboxDesplegable } from './ComboboxDesplegable';
import { useAnclaFlotante } from './useAnclaFlotante';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Texto secundario alineado a la derecha (un conteo, un código…). */
  hint?: string;
  /** Marca a la izquierda de la etiqueta: un punto de color, un emoji, un icono. */
  icon?: ReactNode;
}

interface ComboboxProps {
  options: readonly ComboboxOption[];
  /** `null` = nada elegido; se muestra `placeholder`. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Rótulo visible. Vacío = ninguno; entonces hay que pasar `aria-label`. */
  label?: string;
  'aria-label'?: string;
  /** Etiqueta de la opción que limpia la selección ("Todas las colonias"). */
  placeholder?: string;
  /**
   * `false` en campos obligatorios: quita la fila que limpia la selección, de
   * modo que el desplegable solo ofrezca valores válidos.
   */
  clearable?: boolean;
  /** Filtro por texto. Por defecto aparece si hay más de 8 opciones. */
  searchable?: boolean;
  /** `sm` para contextos densos: celdas de tabla, barras de filtros. */
  size?: 'sm' | 'md';
  disabled?: boolean;
}

const TAMANOS = {
  sm: 'px-2.5 py-1 text-xs2',
  md: 'px-3 py-2.5 text-sm',
} as const;

/** Índice de la fila que limpia la selección; va antes que la primera opción. */
const FILA_VACIA = -1;

/** Con pocas opciones el filtro estorba más de lo que ayuda. */
function usaFiltro(searchable: boolean | undefined, total: number): boolean {
  return searchable ?? total > 8;
}

/**
 * Select del sistema de diseño: mismo aspecto en todos los navegadores, filtro
 * por texto para listas largas y navegación por teclado.
 *
 * Sustituye al `<select>` nativo cuando la lista es grande (las colonias pasan
 * de 700): el desplegable nativo no se puede tematizar, no se puede filtrar y
 * decide por su cuenta si se abre hacia arriba o hacia abajo.
 */
function useCombobox(
  options: readonly ComboboxOption[],
  onChange: (v: string | null) => void,
  clearable: boolean,
) {
  // Sin fila de "limpiar", el recorrido con flechas empieza en la primera opción.
  const primera = clearable ? FILA_VACIA : 0;
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState(primera);
  const disparador = useRef<HTMLButtonElement>(null);

  const filtradas = useMemo(() => {
    const texto = q.trim().toLowerCase();
    if (!texto) return options;
    return options.filter((o) => o.label.toLowerCase().includes(texto));
  }, [options, q]);

  function cerrar() {
    setAbierto(false);
    setQ('');
    disparador.current?.focus(); // el foco vuelve al campo, no se pierde en el body
  }

  function elegir(v: string | null) {
    onChange(v);
    cerrar();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') return cerrar();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, primera));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activo === FILA_VACIA) {
        if (clearable) elegir(null);
      } else {
        elegir(filtradas[activo]?.value ?? null);
      }
    }
  }

  function alternar() {
    setActivo(primera);
    setAbierto((v) => !v);
  }

  function buscar(t: string) {
    setQ(t);
    setActivo(0);
  }

  return { abierto, q, activo, setActivo, disparador, filtradas, cerrar, elegir, onKeyDown, alternar, buscar };
}

export function Combobox({
  options,
  value,
  onChange,
  label = '',
  placeholder = 'Todas',
  clearable = true,
  searchable,
  size = 'md',
  disabled = false,
  ...aria
}: ComboboxProps) {
  const c = useCombobox(options, onChange, clearable);
  const id = useId();
  const listaId = `${id}-lista`;
  const ancla = useAnclaFlotante(c.disparador, c.abierto);
  const seleccionada = options.find((o) => o.value === value);

  return (
    <div className="grid gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-xs2 font-bold uppercase tracking-wider text-fg-subtle">
          {label}
        </label>
      ) : null}

      <Disparador
        ref={c.disparador}
        id={id}
        listaId={listaId}
        abierto={c.abierto}
        disabled={disabled}
        texto={seleccionada?.label ?? placeholder}
        icono={seleccionada?.icon}
        vacio={!seleccionada}
        ariaLabel={aria['aria-label']}
        size={size}
        onClick={c.alternar}
      />

      {c.abierto && ancla
        ? createPortal(
            <ComboboxDesplegable
              id={listaId}
              ancla={ancla}
              conBusqueda={usaFiltro(searchable, options.length)}
              q={c.q}
              onQ={c.buscar}
              opciones={c.filtradas}
              placeholder={placeholder}
              clearable={clearable}
              value={value}
              activo={c.activo}
              onActivo={c.setActivo}
              onElegir={c.elegir}
              onCerrar={c.cerrar}
              onKeyDown={c.onKeyDown}
              disparador={c.disparador}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

interface DisparadorProps {
  id: string;
  listaId: string;
  abierto: boolean;
  disabled: boolean;
  texto: string;
  icono?: ReactNode;
  /** Sin selección: el texto es el placeholder y va atenuado. */
  vacio: boolean;
  ariaLabel?: string;
  size: keyof typeof TAMANOS;
  onClick: () => void;
  ref: React.RefObject<HTMLButtonElement | null>;
}

/** Campo cerrado: se ve como un TextField y anuncia el estado del desplegable. */
function Disparador({
  id,
  listaId,
  abierto,
  disabled,
  texto,
  icono,
  vacio,
  ariaLabel,
  size,
  onClick,
  ref,
}: DisparadorProps) {
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      role="combobox"
      aria-expanded={abierto}
      aria-controls={listaId}
      aria-haspopup="listbox"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-control border border-border bg-bg text-left text-fg outline-none transition-colors hover:border-fg-subtle focus:border-primary disabled:cursor-not-allowed disabled:opacity-60 ${TAMANOS[size]}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icono}
        <span className={`truncate ${vacio ? 'text-fg-subtle' : ''}`}>{texto}</span>
      </span>
      <ChevronDown
        aria-hidden="true"
        className={`shrink-0 text-fg-subtle transition-transform duration-fast ease-out ${
          size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
        } ${abierto ? 'rotate-180' : ''}`}
      />
    </button>
  );
}
