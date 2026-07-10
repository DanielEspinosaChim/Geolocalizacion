import { EmptyState } from '@shared/ui';
import { TIPO_COLORS, tipoDe, type Candidato } from '../model/candidato';
import { giroLabel } from '../model/giros';

const MAX_VISIBLES = 200; // paridad con el legacy: la lista muestra 200, el mapa todo

interface CandidatosListProps {
  data: Candidato[];
  selectedId: string | null;
  onSelect: (candidato: Candidato) => void;
  className?: string;
}

/** Filas de candidatos. No scrollea por su cuenta: lo hace el panel que la contiene. */
export function CandidatosList({ data, selectedId, onSelect, className = '' }: CandidatosListProps) {
  const visibles = data.slice(0, MAX_VISIBLES);
  return (
    <div className={className}>
      {visibles.map((c) => (
        <button
          key={c.place_id}
          type="button"
          onClick={() => onSelect(c)}
          title={c.nombre}
          style={{ borderLeftColor: TIPO_COLORS[tipoDe(c)] }}
          className={`block w-full border-b border-l-[3px] border-b-border px-3 py-2 text-left transition-colors hover:bg-surface-raised ${
            c.place_id === selectedId ? 'bg-surface-raised' : ''
          }`}
        >
          {/* Dos líneas antes de recortar: en 384px de panel, truncar a una sola
              dejaba ilegibles los nombres largos. El `title` da el completo. */}
          <div className="line-clamp-2 break-words text-[13px] font-semibold leading-snug">
            {c.nombre}
          </div>
          <div className="truncate text-xs2 text-fg-muted">{giroLabel(c.tipos)}</div>
        </button>
      ))}
      {data.length > MAX_VISIBLES ? (
        <p className="p-3 text-center text-xs2 text-fg-subtle">
          Mostrando {MAX_VISIBLES.toLocaleString('es-MX')} de {data.length.toLocaleString('es-MX')} —
          afina la búsqueda para ver el resto (el mapa los muestra todos).
        </p>
      ) : null}
      {data.length === 0 ? <EmptyState title="Sin resultados con estos filtros." /> : null}
    </div>
  );
}
