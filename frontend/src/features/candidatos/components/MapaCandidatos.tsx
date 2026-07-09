import { MapCanvas } from '@shared/ui';
import {
  AgebsLayer,
  CapasToggles,
  ColoniasLayer,
  MunicipiosLayer,
  type CapaId,
} from '@features/colonias-zonas';
import type { CacheStatus } from '../api/useCargaProgresiva';
import type { Candidato } from '../model/candidato';
import { CandidatoCard } from './CandidatoCard';
import { ClusterLayer } from './ClusterLayer';
import { EstadoCargaChip } from './EstadoCargaChip';
import { FlyTo } from './FlyTo';

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
        <ClusterLayer candidatos={filtrados} onSelect={onSelect} />
        {props.capas.has('colonias') ? (
          <ColoniasLayer seleccionada={props.coloniaSeleccionada} onSelect={props.onColoniaPoligono} />
        ) : null}
        {props.capas.has('agebs') ? <AgebsLayer /> : null}
        {props.capas.has('municipios') ? <MunicipiosLayer /> : null}
        {seleccionado?.lat != null && seleccionado.lng != null ? (
          <FlyTo lat={seleccionado.lat} lng={seleccionado.lng} />
        ) : null}
      </MapCanvas>
      <div className="absolute left-3 top-3 z-[1000]">
        <CapasToggles activas={props.capas} onToggle={props.onToggleCapa} />
      </div>
      <EstadoCargaChip cargados={props.totalCargados} estado={props.estado} />
      {seleccionado ? (
        <div className="absolute bottom-4 left-4 z-[1000]">
          <CandidatoCard
            key={seleccionado.place_id}
            candidato={seleccionado}
            onClose={() => onSelect(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
