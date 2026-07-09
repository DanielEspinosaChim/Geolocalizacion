import { MousePointerClick, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button, PanelSection, Spinner, TextField, toast } from '@shared/ui';
import type { Prediccion } from '../model/prediccion';
import { PrediccionResultado } from './PrediccionResultado';

interface PrediccionPanelProps {
  modo: boolean;
  onToggleModo: () => void;
  onPredecir: (lat: number, lng: number) => void;
  cargando: boolean;
  resultado: Prediccion | undefined;
}

/** Sidebar de la vista Predicción: modo clic, coordenadas manuales y resultado. */
export function PrediccionPanel({
  modo,
  onToggleModo,
  onPredecir,
  cargando,
  resultado,
}: PrediccionPanelProps) {
  return (
    <aside className="flex w-full flex-col overflow-y-auto border-r border-border bg-surface md:w-96">
      <PanelSection title="Clic en el mapa">
        <Button full variant={modo ? 'secondary' : 'primary'} aria-pressed={modo} onClick={onToggleModo}>
          {modo ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" /> Cancelar predicción por clic
            </>
          ) : (
            <>
              <MousePointerClick className="h-4 w-4" aria-hidden="true" /> Activar predicción por clic
            </>
          )}
        </Button>
        <p className="text-2xs leading-relaxed text-fg-subtle">
          Activa el modo y haz clic sobre cualquier punto del mapa para ver si ahí hay un negocio
          formal, informal o si no hay datos.
        </p>
      </PanelSection>

      <CoordenadasForm onPredecir={onPredecir} cargando={cargando} />

      <PanelSection title="Resultado" grow>
        {cargando ? (
          <div className="flex justify-center py-6">
            <Spinner label="Analizando…" />
          </div>
        ) : resultado ? (
          <PrediccionResultado prediccion={resultado} />
        ) : (
          <p className="text-2xs text-fg-subtle">Haz clic en el mapa o ingresa coordenadas.</p>
        )}
      </PanelSection>
    </aside>
  );
}

function CoordenadasForm({
  onPredecir,
  cargando,
}: Pick<PrediccionPanelProps, 'onPredecir' | 'cargando'>) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!lat.trim() || !lng.trim() || Number.isNaN(nLat) || Number.isNaN(nLng)) {
      toast.error('Ingresa una latitud y una longitud válidas.');
      return;
    }
    if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) {
      toast.error('Coordenadas fuera de rango.');
      return;
    }
    onPredecir(nLat, nLng);
  }

  return (
    <PanelSection title="O ingresa coordenadas">
      <form onSubmit={enviar} className="grid gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Latitud"
            inputMode="decimal"
            placeholder="20.967"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <TextField
            label="Longitud"
            inputMode="decimal"
            placeholder="-89.592"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
        <Button full type="submit" loading={cargando}>
          {cargando ? null : <Search className="h-4 w-4" aria-hidden="true" />} Predecir
        </Button>
      </form>
    </PanelSection>
  );
}
