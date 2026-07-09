import { useState } from 'react';
import { MapCanvas } from '@shared/ui';
import { usePredecir } from '../api/usePredicciones';
import { PrediccionPanel } from '../components/PrediccionPanel';
import { PredictLayer } from '../components/PredictLayer';

export function PrediccionesPage() {
  const [modo, setModo] = useState(false);
  const [punto, setPunto] = useState<{ lat: number; lng: number } | null>(null);
  const predecir = usePredecir();

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
          <PredictLayer activo={modo} punto={punto} onPredict={onPredict} />
        </MapCanvas>
        {modo ? (
          <div className="absolute left-1/2 top-3 z-panel -translate-x-1/2 rounded-full bg-warning px-3 py-1 text-xs2 font-bold text-white shadow-overlay">
            Haz clic en el mapa para predecir en ese punto
          </div>
        ) : null}
      </div>
    </div>
  );
}
