import { Chip } from '@shared/ui';
import { TIPO_LABELS, TIPOS, type Tipo } from '../model/candidato';

const TIPO_TONE: Record<Tipo, 'danger' | 'warning' | 'success'> = {
  informal: 'danger',
  en_proceso: 'warning',
  formal: 'success',
};

interface FiltroEstadoProps {
  valor: Tipo | null;
  onChange: (tipo: Tipo | null) => void;
}

/** Chips de formalización. Volver a pulsar el chip activo quita el filtro. */
export function FiltroEstado({ valor, onChange }: FiltroEstadoProps) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Filtrar por formalización">
      {TIPOS.map((t) => {
        const activo = valor === t;
        return (
          <Chip
            key={t}
            tone={TIPO_TONE[t]}
            active={activo}
            onClick={() => onChange(activo ? null : t)}
          >
            {TIPO_LABELS[t]}
          </Chip>
        );
      })}
    </div>
  );
}
