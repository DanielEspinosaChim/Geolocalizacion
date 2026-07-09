import { FlyTo, MapCanvas, SearchCombobox } from '@shared/ui';
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
import { coloniaDe } from '../model/filtros';
import { giroLabel } from '../model/giros';
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

/** Mapa con clusters, buscador, capas geográficas opcionales y card de detalle. */
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
          <FlyTo lat={seleccionado.lat} lng={seleccionado.lng} />
        ) : null}
      </MapCanvas>
      {/* left-14: deja libre la columna de controles de zoom de Leaflet. */}
      <div className="absolute left-14 top-3 z-[1000] w-72 max-w-[calc(100%-9rem)]">
        <SearchCombobox
          items={filtrados}
          getKey={(c) => c.place_id}
          getLabel={(c) => c.nombre}
          getHint={(c) => [giroLabel(c.tipos), coloniaDe(c)].filter(Boolean).join(' · ') || undefined}
          onSelect={onSelect}
          placeholder="Buscar negocio…"
          aria-label="Buscar negocio por nombre"
        />
      </div>

      <div className="absolute right-3 top-3 z-[1000]">
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
      ) : (
        <Simbologia mostrarProbabilidad={props.capas.has('probabilidad')} />
      )}
    </div>
  );
}
