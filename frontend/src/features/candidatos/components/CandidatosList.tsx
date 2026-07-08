import { TIPO_COLORS, tipoDe, type Candidato } from '../model/candidato';
import { giroLabel } from '../model/giros';

const MAX_VISIBLES = 200; // paridad con el legacy: la lista muestra 200, el mapa todo

interface CandidatosListProps {
  data: Candidato[];
  selectedId: string | null;
  onSelect: (candidato: Candidato) => void;
}

export function CandidatosList({ data, selectedId, onSelect }: CandidatosListProps) {
  const visibles = data.slice(0, MAX_VISIBLES);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {visibles.map((c) => (
        <button
          key={c.place_id}
          type="button"
          onClick={() => onSelect(c)}
          style={{ borderLeftColor: TIPO_COLORS[tipoDe(c)] }}
          className={`block w-full border-b border-l-[3px] border-b-border px-3 py-2 text-left transition-colors hover:bg-surface-raised ${
            c.place_id === selectedId ? 'bg-surface-raised' : ''
          }`}
        >
          <div className="truncate text-[13px] font-semibold">{c.nombre}</div>
          <div className="truncate text-[11px] text-fg-muted">{giroLabel(c.tipos)}</div>
        </button>
      ))}
      {data.length > MAX_VISIBLES ? (
        <p className="p-3 text-center text-[11px] text-fg-subtle">
          Mostrando {MAX_VISIBLES.toLocaleString('es-MX')} de {data.length.toLocaleString('es-MX')} —
          afina la búsqueda para ver el resto (el mapa los muestra todos).
        </p>
      ) : null}
      {data.length === 0 ? (
        <p className="p-6 text-center text-sm text-fg-muted">Sin resultados con estos filtros.</p>
      ) : null}
    </div>
  );
}
