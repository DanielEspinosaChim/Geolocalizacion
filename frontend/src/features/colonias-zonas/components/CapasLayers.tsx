import { AgebsLayer } from './AgebsLayer';
import type { CapaId } from './CapasToggles';
import { ColoniasLayer } from './ColoniasLayer';
import { MunicipiosLayer } from './MunicipiosLayer';
import { ProbabilidadLayer } from './ProbabilidadLayer';

interface CapasLayersProps {
  activas: ReadonlySet<CapaId>;
  /** Colonia resaltada (MAYÚSCULAS). Solo el mapa de candidatos la usa. */
  coloniaSeleccionada?: string | null;
  /** Clic en un polígono de colonia. Si falta, los polígonos no son accionables. */
  onColoniaPoligono?: (nombreUpper: string) => void;
}

const SIN_ACCION = () => undefined;

/**
 * Las cuatro capas geográficas opcionales, montadas según los toggles.
 * Va **dentro** de `<MapCanvas>`; los toggles (`CapasToggles`) van fuera, sobre él.
 */
export function CapasLayers({
  activas,
  coloniaSeleccionada = null,
  onColoniaPoligono = SIN_ACCION,
}: CapasLayersProps) {
  return (
    <>
      {activas.has('probabilidad') ? <ProbabilidadLayer /> : null}
      {activas.has('colonias') ? (
        <ColoniasLayer seleccionada={coloniaSeleccionada} onSelect={onColoniaPoligono} />
      ) : null}
      {activas.has('agebs') ? <AgebsLayer /> : null}
      {activas.has('municipios') ? <MunicipiosLayer /> : null}
    </>
  );
}
