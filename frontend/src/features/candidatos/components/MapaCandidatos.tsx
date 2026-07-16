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
  /** El buscador está enfocado (con sugerencias desplegadas sobre el mapa). */
  buscando: boolean;
  onBuscando: (b: boolean) => void;
}

/** Mapa con clusters, capas geográficas opcionales y globo de detalle. */
export function MapaCandidatos(props: MapaCandidatosProps) {
  const { visible, filtrados, seleccionado, onSelect, capas, buscando } = props;
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

      {/* Columna flotante superior: buscador y, debajo, el contador. En móvil
          ocupa casi todo el ancho y las capas van en fila junto al contador;
          en escritorio es una caja a la izquierda y las capas se van a la
          derecha (bloque de abajo). */}
      <div className="absolute inset-x-2 top-2 z-panel flex flex-col gap-2 md:inset-x-auto md:left-3 md:top-3 md:w-[min(22rem,calc(100%-7rem))]">
        <BuscadorNegocios
          q={props.busqueda}
          onQ={props.onBusqueda}
          resultados={filtrados}
          onSelect={onSelect}
          onFocoChange={props.onBuscando}
        />
        {/* Móvil: solo las capas en fila (el contador se omite: el botón
            "Negocios" del cajón ya muestra el total). */}
        <div className="md:hidden">
          <CapasToggles activas={capas.activas} onToggle={capas.alternar} orientation="row" />
        </div>
        {/* Escritorio: el contador aquí; las capas van a la derecha. */}
        <div className="hidden self-start md:block">
          <EstadoCargaChip cargados={props.totalCargados} estado={props.estado} />
        </div>
      </div>

      {/* Toggles de capas a la derecha (solo escritorio). */}
      <div className="absolute right-3 top-3 z-panel hidden md:block">
        <CapasToggles activas={capas.activas} onToggle={capas.alternar} />
      </div>

      {/* Simbología: abajo-izquierda. Se oculta mientras se busca para no
          competir con el panel de sugerencias. */}
      {buscando ? null : <Simbologia capas={capas.activas} />}
    </div>
  );
}
