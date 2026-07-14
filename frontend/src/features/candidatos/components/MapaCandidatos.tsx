import { FlyTo, MapCanvas, MapPopup } from '@shared/ui';
import { CapasLayers, CapasToggles, type Capas } from '@features/colonias-zonas';
import type { Candidato } from '../model/candidato';
import type { CacheStatus } from '../model/metricas';
import { BuscadorNegocios } from './BuscadorNegocios';
import { CandidatoCard } from './CandidatoCard';
import { ClusterLayer } from './ClusterLayer';
import { EstadoCargaChip } from './EstadoCargaChip';
import { Simbologia } from './Simbologia';

interface MapaCandidatosProps {
  visible: boolean;
  filtrados: Candidato[];
  totalCargados: number;
  estado: CacheStatus | undefined;
  capas: Capas;
  coloniaSeleccionada: string | null;
  onColoniaPoligono: (nombreUpper: string) => void;
  seleccionado: Candidato | null;
  onSelect: (c: Candidato | null) => void;
  busqueda: string;
  onBusqueda: (q: string) => void;
}

/** Mapa con clusters, capas geográficas opcionales y globo de detalle. */
export function MapaCandidatos(props: MapaCandidatosProps) {
  const { visible, filtrados, seleccionado, onSelect, capas } = props;
  return (
    <div className={`relative flex-1 md:block ${visible ? 'block' : 'hidden'}`}>
      {/* Zoom abajo-derecha (patrón Google Maps); la izquierda es del panel. */}
      <MapCanvas zoomPosition="bottomright">
        <ClusterLayer candidatos={filtrados} onSelect={onSelect} />
        <CapasLayers
          activas={capas.activas}
          coloniaSeleccionada={props.coloniaSeleccionada}
          onColoniaPoligono={props.onColoniaPoligono}
        />
        {seleccionado?.lat != null && seleccionado.lng != null ? (
          <>
            {/* FlyTo sigue haciendo falta: al elegir desde la lista, el negocio
                puede estar fuera de la vista y el globo no se vería. */}
            <FlyTo lat={seleccionado.lat} lng={seleccionado.lng} />
            <MapPopup
              key={seleccionado.place_id}
              lat={seleccionado.lat}
              lng={seleccionado.lng}
              onClose={() => onSelect(null)}
            >
              <CandidatoCard candidato={seleccionado} />
            </MapPopup>
          </>
        ) : null}
      </MapCanvas>

      {/* Columna flotante arriba-izquierda: buscador y, debajo, el contador de
          candidatos. El ancho deja sitio a los toggles de capas de la derecha;
          las sugerencias del buscador flotan por encima del contador. */}
      <div className="absolute left-3 top-3 z-panel flex w-[min(22rem,calc(100%-5rem))] flex-col gap-2">
        <BuscadorNegocios
          q={props.busqueda}
          onQ={props.onBusqueda}
          resultados={filtrados}
          onSelect={onSelect}
        />
        <div className="self-start">
          <EstadoCargaChip cargados={props.totalCargados} estado={props.estado} />
        </div>
      </div>

      {/* Toggles de capas: arriba-derecha en todas las vistas del mapa. */}
      <div className="absolute right-3 top-3 z-panel">
        <CapasToggles activas={capas.activas} onToggle={capas.alternar} />
      </div>

      {/* Simbología: abajo-izquierda en todas las vistas (posición por defecto
          de LeyendaCapas). */}
      <Simbologia capas={capas.activas} />
    </div>
  );
}
