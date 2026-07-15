import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { SearchInput } from '@shared/ui';
import { tipoDe, type Candidato } from '../model/candidato';
import { giroLabel } from '../model/giros';
import { PuntoTipo } from './PuntoTipo';

/* Suficientes para reconocer el negocio buscado; la lista completa de
   resultados vive en la sección "Negocios" del panel lateral. */
const MAX_SUGERENCIAS = 8;

interface BuscadorNegociosProps {
  q: string;
  onQ: (q: string) => void;
  /** Candidatos ya filtrados por `q` (y el resto de filtros activos). */
  resultados: Candidato[];
  onSelect: (c: Candidato) => void;
  /** Avisa cuando el buscador toma/suelta el foco (para ocultar otros overlays). */
  onFocoChange?: (enfocado: boolean) => void;
}

/**
 * Buscador flotante sobre el mapa (patrón map-first). En escritorio despliega
 * un panel de sugerencias bajo el input; en móvil, al enfocarlo ocupa toda la
 * pantalla (overlay) para buscar cómodamente, con una flecha para volver.
 */
export function BuscadorNegocios({ q, onQ, resultados, onSelect, onFocoChange }: BuscadorNegociosProps) {
  const [conFoco, setConFoco] = useState(false);
  const abierto = conFoco && q.trim().length > 0;
  const sugerencias = resultados.slice(0, MAX_SUGERENCIAS);

  function cambiarFoco(v: boolean) {
    setConFoco(v);
    onFocoChange?.(v);
  }

  function elegir(c: Candidato) {
    onSelect(c);
    cambiarFoco(false);
    // En móvil el overlay es fixed; quitar el foco lo cierra y devuelve el mapa.
    (document.activeElement as HTMLElement | null)?.blur();
  }

  return (
    <div
      // Al enfocar en móvil el buscador pasa a overlay a pantalla completa
      // (fixed inset-0); en escritorio (md:) siempre es una caja flotante.
      className={
        conFoco
          ? 'fixed inset-0 z-modal flex flex-col bg-bg p-3 md:relative md:inset-auto md:z-panel md:block md:bg-transparent md:p-0'
          : 'relative'
      }
      onFocusCapture={() => cambiarFoco(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) cambiarFoco(false);
      }}
    >
      <div className="flex items-center gap-2">
        {conFoco ? (
          <button
            type="button"
            aria-label="Cerrar búsqueda"
            onMouseDown={(e) => {
              e.preventDefault();
              cambiarFoco(false);
            }}
            className="shrink-0 rounded-full p-1.5 text-fg-muted hover:bg-surface-raised hover:text-fg md:hidden"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <SearchInput
            value={q}
            onChange={onQ}
            debounceMs={200}
            placeholder="Buscar negocio…"
            aria-label="Buscar negocio por nombre"
            className="border-border/60 bg-surface py-2.5 shadow-glass focus:bg-surface"
          />
        </div>
      </div>

      {abierto ? (
        <div className="glass-card mt-2 flex-1 overflow-y-auto rounded-card border md:absolute md:inset-x-0 md:top-full md:z-panel md:mt-2 md:max-h-[70vh]">
          {sugerencias.map((c) => (
            <button
              key={c.place_id}
              type="button"
              // mousedown, no click: el click llega tras el blur que cierra el
              // panel y la sugerencia ya no existiría al soltar el botón.
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(c);
              }}
              className="flex w-full items-center gap-2.5 border-b border-border/60 px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-raised"
            >
              <PuntoTipo tipo={tipoDe(c)} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold leading-snug">
                  {c.nombre}
                </span>
                <span className="block truncate text-xs2 text-fg-muted">
                  {giroLabel(c.tipos)}
                  {c.colonia_nombre ? ` · ${c.colonia_nombre}` : ''}
                </span>
              </span>
            </button>
          ))}
          {sugerencias.length === 0 ? (
            <p className="px-3 py-2.5 text-xs2 text-fg-subtle">Sin coincidencias.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
