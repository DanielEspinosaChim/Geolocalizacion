import { useState } from 'react';
import { MapPopup } from '@shared/ui';
import type { Candidato } from '../model/candidato';
import { CandidatoCard } from './CandidatoCard';
import { ClusterLayer } from './ClusterLayer';

interface CapaCandidatosProps {
  candidatos: Candidato[];
  /**
   * `false` pinta los marcadores pero no abre su globo. Lo usa Predicción
   * mientras el modo "clic en el mapa" está activo: ahí el clic sobre un
   * negocio debe predecir en ese punto, no destapar una tarjeta encima.
   */
  interactivo?: boolean;
}

const NO_SELECCIONAR = () => undefined;

/**
 * Los negocios como clusters de colores, con su globo de detalle al pulsarlos.
 * Va **dentro** de `<MapCanvas>` y se basta sola: guarda qué marcador está
 * abierto, así cualquier mapa la monta sin cablear estado.
 *
 * El mapa de candidatos NO la usa: allí la selección se comparte con el panel
 * lateral, y la orquesta `MapaCandidatos`.
 */
export function CapaCandidatos({ candidatos, interactivo = true }: CapaCandidatosProps) {
  const [seleccionado, setSeleccionado] = useState<Candidato | null>(null);

  return (
    <>
      <ClusterLayer
        candidatos={candidatos}
        onSelect={interactivo ? setSeleccionado : NO_SELECCIONAR}
      />
      {interactivo && seleccionado?.lat != null && seleccionado.lng != null ? (
        <MapPopup
          key={seleccionado.place_id}
          lat={seleccionado.lat}
          lng={seleccionado.lng}
          onClose={() => setSeleccionado(null)}
        >
          <CandidatoCard candidato={seleccionado} />
        </MapPopup>
      ) : null}
    </>
  );
}
