import { FlyTo, MapCanvas, MapPopup } from '@shared/ui';
import { CapasLayers, CapasToggles, type Capas } from '@features/colonias-zonas';
import type { Candidato } from '../model/candidato';
import type { CacheStatus } from '../model/metricas';
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
}

/** Mapa con clusters, capas geográficas opcionales y globo de detalle. */
export function MapaCandidatos(props: MapaCandidatosProps) {
  const { visible, filtrados, seleccionado, onSelect, capas } = props;
  return (
    <div className={`relative flex-1 md:block ${visible ? 'block' : 'hidden'}`}>
      <MapCanvas>
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

      <div className="absolute right-3 top-3 z-panel">
        <CapasToggles activas={capas.activas} onToggle={capas.alternar} />
      </div>

      <EstadoCargaChip cargados={props.totalCargados} estado={props.estado} />
      <Simbologia capas={capas.activas} />
    </div>
  );
}
