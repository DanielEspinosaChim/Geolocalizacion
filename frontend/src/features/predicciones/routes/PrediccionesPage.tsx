import { useState } from 'react';
import { BottomSheet, MapCanvas } from '@shared/ui';
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

  const panel = (
    <PrediccionPanel
      modo={modo}
      onToggleModo={() => setModo((m) => !m)}
      onPredecir={onPredict}
      cargando={predecir.isPending}
      resultado={predecir.data}
    />
  );

  return (
    // En móvil el mapa manda (ahí se hace clic para predecir); el panel vive en
    // el cajón inferior, igual que en Candidatos/Rutas/Reportes.
    <div className="relative flex h-full">
      <aside className="scrollbar-slim flex w-96 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface max-md:hidden">
        {panel}
      </aside>

      <div className="relative min-w-0 flex-1">
        <MapCanvas zoomPosition="bottomright">
          <CapaCandidatos candidatos={candidatos} interactivo={!modo} />
          <PredictLayer activo={modo} punto={punto} onPredict={onPredict} />
          <CapasLayers activas={capas.activas} />
        </MapCanvas>

        {/* Overlays consistentes en todas las vistas del mapa: capas
            arriba-derecha, simbología abajo-izquierda. */}
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

      <BottomSheet className="md:hidden" title="Predicción">
        {panel}
      </BottomSheet>
    </div>
  );
}
