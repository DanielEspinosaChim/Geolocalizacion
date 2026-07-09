import { Check, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ComboboxOption } from './Combobox';
import type { Ancla } from './useAnclaFlotante';

export interface DesplegableProps {
  id: string;
  ancla: Ancla;
  conBusqueda: boolean;
  q: string;
  onQ: (q: string) => void;
  opciones: readonly ComboboxOption[];
  placeholder: string;
  /** `false` oculta la fila que limpia la selección (campos obligatorios). */
  clearable: boolean;
  value: string | null;
  activo: number;
  onActivo: (i: number) => void;
  onElegir: (v: string | null) => void;
  onCerrar: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disparador: React.RefObject<HTMLButtonElement | null>;
}

/** Panel flotante del Combobox: filtro, lista de opciones y cierre al clic fuera. */
export function ComboboxDesplegable(p: DesplegableProps) {
  const caja = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const busqueda = useRef<HTMLInputElement>(null);

  // Si no hay filtro, el foco va a la lista para que el teclado siga funcionando.
  useEffect(() => (busqueda.current ?? lista.current)?.focus(), []);

  // Arrastra el scroll tras la opción activa: con cientos de opciones las flechas
  // la sacarían de la vista. `nearest` no hace nada si ya se ve, así que el hover
  // del ratón no provoca saltos.
  useEffect(() => {
    const opcion = lista.current?.querySelector<HTMLElement>(`[data-idx="${p.activo}"]`);
    // Llamada opcional: jsdom no implementa scrollIntoView.
    opcion?.scrollIntoView?.({ block: 'nearest' });
  }, [p.activo]);

  const { onCerrar, disparador } = p;
  useEffect(() => {
    function fuera(e: PointerEvent) {
      const t = e.target as Node;
      if (!caja.current?.contains(t) && !disparador.current?.contains(t)) onCerrar();
    }
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [onCerrar, disparador]);

  return (
    <div
      ref={caja}
      style={{
        position: 'fixed',
        // Al abrir hacia arriba se ancla por abajo: así crece hacia el techo sin
        // recalcular la altura del panel.
        top: p.ancla.arriba ? undefined : p.ancla.top,
        bottom: p.ancla.arriba ? window.innerHeight - p.ancla.top : undefined,
        left: p.ancla.left,
        width: p.ancla.width,
        maxHeight: p.ancla.maxHeight,
      }}
      /* Entra deslizándose desde el lado del disparador: si abrió hacia arriba,
         sube desde abajo, y al revés. El movimiento cuenta de dónde salió. */
      className={`z-modal flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-overlay duration-fast animate-in fade-in-0 zoom-in-95 ${
        p.ancla.arriba ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'
      }`}
    >
      {p.conBusqueda ? (
        <Filtro ref={busqueda} q={p.q} onQ={p.onQ} onKeyDown={p.onKeyDown} />
      ) : null}

      <div
        id={p.id}
        ref={lista}
        role="listbox"
        tabIndex={-1}
        onKeyDown={p.onKeyDown}
        className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-1 outline-none"
      >
        {p.clearable ? (
          <Opcion
            idx={-1}
            activa={p.activo === -1}
            elegida={p.value === null}
            onPointerEnter={() => p.onActivo(-1)}
            onClick={() => p.onElegir(null)}
          >
            <span className="text-fg-subtle">{p.placeholder}</span>
          </Opcion>
        ) : null}

        {p.opciones.map((o, i) => (
          <Opcion
            key={o.value}
            idx={i}
            activa={p.activo === i}
            elegida={p.value === o.value}
            onPointerEnter={() => p.onActivo(i)}
            onClick={() => p.onElegir(o.value)}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
            {o.hint ? (
              <span className="ml-auto shrink-0 text-2xs text-fg-subtle">{o.hint}</span>
            ) : null}
          </Opcion>
        ))}

        {p.opciones.length === 0 ? (
          <p className="px-2 py-3 text-center text-2xs text-fg-subtle">Sin coincidencias.</p>
        ) : null}
      </div>
    </div>
  );
}

function Opcion({
  idx,
  activa,
  elegida,
  children,
  ...rest
}: {
  idx: number;
  activa: boolean;
  elegida: boolean;
  children: React.ReactNode;
  onPointerEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      {...rest}
      data-idx={idx}
      type="button"
      role="option"
      aria-selected={elegida}
      tabIndex={-1}
      className={`flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm transition-colors ${
        activa ? 'bg-surface-raised text-fg' : 'text-fg-muted'
      }`}
    >
      <Check
        aria-hidden="true"
        className={`h-3.5 w-3.5 shrink-0 text-primary ${elegida ? '' : 'invisible'}`}
      />
      {children}
    </button>
  );
}

/** Campo de filtro dentro del desplegable; recibe el foco al abrirse. */
function Filtro({
  ref,
  q,
  onQ,
  onKeyDown,
}: {
  ref: React.RefObject<HTMLInputElement | null>;
  q: string;
  onQ: (q: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div className="relative shrink-0 border-b border-border p-2">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
      />
      <input
        ref={ref}
        type="search"
        value={q}
        aria-label="Filtrar opciones"
        placeholder="Filtrar…"
        onChange={(e) => onQ(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full rounded-control border border-border bg-bg py-1.5 pl-8 pr-2 text-sm text-fg outline-none placeholder:text-fg-subtle/60 focus:border-primary"
      />
    </div>
  );
}
