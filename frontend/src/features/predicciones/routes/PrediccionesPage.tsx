import { useState } from 'react';
import { MapCanvas } from '@shared/ui';
import { CapaCandidatos, Simbologia, useCandidatos } from '@features/candidatos';
import { CapasLayers, CapasToggles, useCapas } from '@features/colonias-zonas';
import { usePredecir } from '../api/usePredicciones';
import { PrediccionPanel } from '../components/PrediccionPanel';
import { PredictLayer } from '../components/PredictLayer';

export function PrediccionesPage() {
  const [modo, setModo] = useState(false);
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const predecir = usePredecir();
  const capas = useCapas();
  const { data: candidatos = [] } = useCandidatos();

  function onPredict(lat: number, lng: number) {
    setModo(false);
    setPunto({ lat, lng });
    predecir.mutate({ lat, lng });
  }

  return (
    <div className="flex h-full">
      <PrediccionPanel
        modo={modo}
        onToggleModo={() => setModo((m) => !m)}
        onPredecir={onPredict}
        cargando={predecir.isPending}
        resultado={predecir.data}
      />
      <div className="relative hidden flex-1 md:block">
        <MapCanvas>
          <CapaCandidatos candidatos={candidatos} interactivo={!modo} />
          <PredictLayer activo={modo} punto={punto} onPredict={onPredict} />
          <CapasLayers activas={capas.activas} />
        </MapCanvas>

        <div className="absolute right-3 top-3 z-panel">
          <CapasToggles activas={capas.activas} onToggle={capas.alternar} />
        </div>
        <Simbologia capas={capas.activas} />

        {modo ? (
          <div className="absolute left-1/2 top-3 z-panel -translate-x-1/2 rounded-full bg-warning px-3 py-1 text-xs2 font-bold text-white shadow-overlay">
            Haz clic en el mapa para predecir en ese punto
          </div>
        ) : null}
      </div>
    </div>
  );
}
