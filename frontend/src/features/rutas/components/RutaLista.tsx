import { Check } from 'lucide-react';
import { giroLabel, type Candidato } from '@features/candidatos';

const MAX_VISIBLES = 300; // paridad con el legacy

interface RutaListaProps {
  candidatos: Candidato[];
  q: string;
  seleccion: ReadonlySet<string>;
  onToggle: (placeId: string) => void;
}

/** Lista seleccionable de puntos para la ruta (checkbox visual, máx. 20). */
export function RutaLista({ candidatos, q, seleccion, onToggle }: RutaListaProps) {
  const texto = q.trim().toLowerCase();
  const filtrados = texto
    ? candidatos.filter((c) => c.nombre.toLowerCase().includes(texto))
    : candidatos;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {filtrados.slice(0, MAX_VISIBLES).map((c) => {
        const activo = seleccion.has(c.place_id);
        return (
          <button
            key={c.place_id}
            type="button"
            aria-pressed={activo}
            onClick={() => onToggle(c.place_id)}
            className={`flex w-full items-center gap-2.5 border-b border-border px-3 py-2 text-left transition-colors hover:bg-surface-raised ${
              activo ? 'bg-primary/10' : ''
            }`}
          >
            <span
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border ${
                activo ? 'border-primary bg-primary text-primary-fg' : 'border-border'
              }`}
            >
              {activo ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold">{c.nombre}</span>
              <span className="block truncate text-[11px] text-fg-muted">
                {giroLabel(c.tipos)}
                {c.colonia_denue ? ` · ${c.colonia_denue.toLowerCase()}` : ''}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
