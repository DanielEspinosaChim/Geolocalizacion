import { FlyTo, MapCanvas, MapPopup } from '@shared/ui';
import {
  AgebsLayer,
  CapasToggles,
  ColoniasLayer,
  MunicipiosLayer,
  ProbabilidadLayer,
  type CapaId,
} from '@features/colonias-zonas';
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
  capas: ReadonlySet<CapaId>;
  onToggleCapa: (c: CapaId) => void;
  coloniaSeleccionada: string | null;
  onColoniaPoligono: (nombreUpper: string) => void;
  seleccionado: Candidato | null;
  onSelect: (c: Candidato | null) => void;
}

/** Mapa con clusters, capas geográficas opcionales y card de detalle. */
export function MapaCandidatos(props: MapaCandidatosProps) {
  const { visible, filtrados, seleccionado, onSelect } = props;
  return (
    <div className={`relative flex-1 md:block ${visible ? 'block' : 'hidden'}`}>
      <MapCanvas>
        {props.capas.has('probabilidad') ? <ProbabilidadLayer /> : null}
        <ClusterLayer candidatos={filtrados} onSelect={onSelect} />
        {props.capas.has('colonias') ? (
          <ColoniasLayer seleccionada={props.coloniaSeleccionada} onSelect={props.onColoniaPoligono} />
        ) : null}
        {props.capas.has('agebs') ? <AgebsLayer /> : null}
        {props.capas.has('municipios') ? <MunicipiosLayer /> : null}
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
        <CapasToggles activas={props.capas} onToggle={props.onToggleCapa} />
      </div>

      <EstadoCargaChip cargados={props.totalCargados} estado={props.estado} />
      <Simbologia mostrarProbabilidad={props.capas.has('probabilidad')} />
    </div>
  );
}
