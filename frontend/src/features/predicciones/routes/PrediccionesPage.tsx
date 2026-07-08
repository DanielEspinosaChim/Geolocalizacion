import { useState } from 'react';
import { Button, MapCanvas, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui';
import { usePredecir } from '../api/usePredicciones';
import { IndicePanel } from '../components/IndicePanel';
import { PredictLayer } from '../components/PredictLayer';
import { PrediccionResultado } from '../components/PrediccionResultado';

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
    <Tabs defaultValue="mapa" className="flex h-full flex-col">
      <TabsList className="px-3">
        <TabsTrigger value="mapa">Predicción por clic</TabsTrigger>
        <TabsTrigger value="indice">Índice de informalidad</TabsTrigger>
      </TabsList>

      <TabsContent value="mapa" className="relative min-h-0 flex-1 pt-0">
        <MapCanvas>
          <PredictLayer activo={modo} punto={punto} onPredict={onPredict} />
        </MapCanvas>
        <div className="absolute left-3 top-3 z-[1000]">
          <Button aria-pressed={modo} onClick={() => setModo((m) => !m)}>
            {modo ? '🔴 Cancelar' : '🖱️ Predecir por clic'}
          </Button>
        </div>
        <div className="absolute bottom-4 left-4 z-[1000] w-64">
          {predecir.isPending ? (
            <div className="flex justify-center rounded-card border border-border bg-surface p-4">
              <Spinner label="Analizando…" />
            </div>
          ) : predecir.data ? (
            <PrediccionResultado prediccion={predecir.data} />
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="indice" className="min-h-0 flex-1 overflow-y-auto p-4">
        <IndicePanel />
      </TabsContent>
    </Tabs>
  );
}
