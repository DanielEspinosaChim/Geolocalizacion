import { Chip, SearchInput } from '@shared/ui';
import { TIPO_LABELS, TIPOS, type Tipo } from '../model/candidato';
import type { Filtros } from '../model/filtros';

const TIPO_TONE: Record<Tipo, 'danger' | 'warning' | 'success'> = {
  informal: 'danger',
  en_proceso: 'warning',
  formal: 'success',
};

interface FiltrosBarProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
}

export function FiltrosBar({ filtros, onChange }: FiltrosBarProps) {
  return (
    <div className="grid gap-2 border-b border-border p-3">
      <SearchInput
        value={filtros.q}
        onChange={(q) => onChange({ ...filtros, q })}
        debounceMs={200}
        placeholder="Buscar negocio…"
        aria-label="Buscar negocio por nombre"
      />
      <div className="flex gap-1.5" role="group" aria-label="Filtrar por formalización">
        {TIPOS.map((t) => {
          const activo = filtros.tipo === t;
          return (
            <Chip
              key={t}
              tone={TIPO_TONE[t]}
              active={activo}
              onClick={() => onChange({ ...filtros, tipo: activo ? null : t })}
            >
              {TIPO_LABELS[t]}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
