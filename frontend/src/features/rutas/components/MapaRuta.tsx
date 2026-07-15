import { ClipboardCheck } from 'lucide-react';
import { Button, MapCanvas, MapPopup } from '@shared/ui';
import { CandidatoCard, CapaCandidatos, Simbologia, type Candidato } from '@features/candidatos';
import { CapasLayers, CapasToggles, type Capas } from '@features/colonias-zonas';
import type { RutaCalculada } from '../model/ruta';
import { RutaLayer } from './RutaLayer';

interface MapaRutaProps {
  candidatos: Candidato[];
  ruta: RutaCalculada | undefined;
  capas: Capas;
  parada: Candidato | null;
  onParadaClick: (placeId: string) => void;
  onCerrarParada: () => void;
  /** Si la ruta viene de una campaña, cada parada ofrece "Registrar visita". */
  campanaOrigen: string | null;
  onRegistrar: (placeId: string) => void;
}

/** Mapa de la vista de rutas: candidatos, línea de ruta, capas y popup de parada. */
export function MapaRuta({
  candidatos,
  ruta,
  capas,
  parada,
  onParadaClick,
  onCerrarParada,
  campanaOrigen,
  onRegistrar,
}: MapaRutaProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <MapCanvas zoomPosition="bottomright">
        <CapaCandidatos candidatos={candidatos} />
        {ruta ? <RutaLayer ruta={ruta} onParadaClick={onParadaClick} /> : null}
        <CapasLayers activas={capas.activas} />
        {parada?.lat != null && parada.lng != null ? (
          <MapPopup key={parada.place_id} lat={parada.lat} lng={parada.lng} onClose={onCerrarParada}>
            <CandidatoCard
              candidato={parada}
              accion={
                campanaOrigen ? (
                  <Button full size="sm" onClick={() => onRegistrar(parada.place_id)}>
                    <ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Registrar visita
                  </Button>
                ) : null
              }
            />
          </MapPopup>
        ) : null}
      </MapCanvas>

      {/* Overlays consistentes en todas las vistas del mapa: capas
          arriba-derecha, simbología abajo-izquierda. */}
      <div className="absolute right-3 top-3 z-panel">
        <CapasToggles activas={capas.activas} onToggle={capas.alternar} />
      </div>
      <Simbologia capas={capas.activas} />
    </div>
  );
}
