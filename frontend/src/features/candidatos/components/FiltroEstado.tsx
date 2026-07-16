import { Button } from '@shared/ui';
import { TIPO_LABELS, TIPOS, type Tipo } from '../model/candidato';
import { PuntoTipo } from './PuntoTipo';

interface FiltroEstadoProps {
  valor: Tipo | null;
  onChange: (tipo: Tipo | null) => void;
}

/**
 * Filtro de formalización con el mismo formato de botón que los controles de
 * Reportes ("Mi ubicación" / "Clic en mapa"): botones de ancho igual en rejilla.
 * El activo se rellena con el acento de marca (primary = ocre); el punto de
 * color replica el del marcador del mapa. Volver a pulsarlo quita el filtro.
 */
export function FiltroEstado({ valor, onChange }: FiltroEstadoProps) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Filtrar por formalización">
      {TIPOS.map((t) => {
        const activo = valor === t;
        return (
          <Button
            key={t}
            type="button"
            variant={activo ? 'primary' : 'secondary'}
            size="sm"
            aria-pressed={activo}
            onClick={() => onChange(activo ? null : t)}
          >
            <PuntoTipo tipo={t} />
            {TIPO_LABELS[t]}
          </Button>
        );
      })}
    </div>
  );
}
