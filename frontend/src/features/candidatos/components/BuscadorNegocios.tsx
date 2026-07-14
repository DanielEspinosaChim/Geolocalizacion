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
}

/**
 * Buscador flotante sobre el mapa (patrón de apps map-first). Al escribir se
 * despliega un panel de sugerencias con lo que Google Maps no puede mostrar:
 * el estado de formalización, el giro y la colonia de cada negocio.
 */
export function BuscadorNegocios({ q, onQ, resultados, onSelect }: BuscadorNegociosProps) {
  const [conFoco, setConFoco] = useState(false);
  const abierto = conFoco && q.trim().length > 0;
  const sugerencias = resultados.slice(0, MAX_SUGERENCIAS);

  return (
    <div
      className="relative"
      onFocusCapture={() => setConFoco(true)}
      // Se cierra solo cuando el foco sale del conjunto entero (input + lista):
      // así el clic en una sugerencia no muere por el blur del input.
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setConFoco(false);
      }}
    >
      <SearchInput
        value={q}
        onChange={onQ}
        debounceMs={200}
        placeholder="Buscar negocio…"
        aria-label="Buscar negocio por nombre"
        className="border-border/60 bg-surface py-2.5 shadow-glass focus:bg-surface"
      />
      {abierto ? (
        <div className="glass-card absolute inset-x-0 top-full z-panel mt-2 overflow-hidden rounded-card border">
          {sugerencias.map((c) => (
            <button
              key={c.place_id}
              type="button"
              // mousedown, no click: el click llega después del blur que cierra
              // el panel y la sugerencia ya no existiría al soltar el botón.
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(c);
                setConFoco(false);
              }}
              className="flex w-full items-center gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-raised"
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
