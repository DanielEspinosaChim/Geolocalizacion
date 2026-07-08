import { TIPO_LABELS, TIPOS, type Tipo } from '../model/candidato';
import type { Filtros } from '../model/filtros';

const CHIP_ACTIVO: Record<Tipo, string> = {
  informal: 'border-danger bg-danger/15 text-danger',
  en_proceso: 'border-warning bg-warning/15 text-warning',
  formal: 'border-success bg-success/15 text-success',
};

interface FiltrosBarProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
}

export function FiltrosBar({ filtros, onChange }: FiltrosBarProps) {
  return (
    <div className="grid gap-2 border-b border-border p-3">
      <input
        type="search"
        value={filtros.q}
        onChange={(e) => onChange({ ...filtros, q: e.target.value })}
        placeholder="Buscar negocio…"
        aria-label="Buscar negocio por nombre"
        className="w-full rounded-control border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle/60 focus:border-primary"
      />
      <div className="flex gap-1.5" role="group" aria-label="Filtrar por formalización">
        {TIPOS.map((t) => {
          const activo = filtros.tipo === t;
          return (
            <button
              key={t}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange({ ...filtros, tipo: activo ? null : t })}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                activo ? CHIP_ACTIVO[t] : 'border-border text-fg-muted hover:text-fg'
              }`}
            >
              {TIPO_LABELS[t]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
