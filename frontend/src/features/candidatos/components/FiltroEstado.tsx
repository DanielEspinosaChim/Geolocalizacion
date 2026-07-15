import { Chip } from '@shared/ui';
import { TIPO_LABELS, TIPOS, type Tipo } from '../model/candidato';
import { PuntoTipo } from './PuntoTipo';

interface FiltroEstadoProps {
  valor: Tipo | null;
  onChange: (tipo: Tipo | null) => void;
}

/**
 * Chips de formalización. Volver a pulsar el chip activo quita el filtro.
 * El chip activo se pinta con el color de marca secundario (ocre); el estado lo
 * distingue el punto de color, que replica el del marcador en el mapa.
 */
export function FiltroEstado({ valor, onChange }: FiltroEstadoProps) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Filtrar por formalización">
      {TIPOS.map((t) => {
        const activo = valor === t;
        return (
          <Chip key={t} tone="secondary" active={activo} onClick={() => onChange(activo ? null : t)}>
            <PuntoTipo tipo={t} />
            {TIPO_LABELS[t]}
          </Chip>
        );
      })}
    </div>
  );
}
