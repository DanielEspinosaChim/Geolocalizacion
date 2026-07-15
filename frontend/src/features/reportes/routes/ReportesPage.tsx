import { History } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { BottomSheet, FlyTo, MapCanvas, PanelSection } from '@shared/ui';
import { Simbologia } from '@features/candidatos';
import { CapasLayers, CapasToggles, useCapas } from '@features/colonias-zonas';
import { reverseGeocode } from '@shared/api';
import { useReportes } from '../api/useReportes';
import { ReporteForm, type Ubicacion } from '../components/ReporteForm';
import { ReporteItem } from '../components/ReporteItem';
import { ReportesLayer, UbicacionPicker, UbicacionTemporal } from '../components/ReportesLayer';
import type { Reporte } from '../model/reporte';

/**
 * Alta de reportes. El historial completo vive en `/reportes/historial`: aquí
 * solo se muestra el que acabas de crear, para que el panel no se acumule.
 */
export function ReportesPage() {
  // Sin filtro: los marcadores del mapa deben mostrar todos los reportes.
  const { data: reportes = [] } = useReportes(null);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [modoMapa, setModoMapa] = useState(false);
  const [creado, setCreado] = useState<Reporte | null>(null);
  const [foco, setFoco] = useState<Reporte | null>(null);
  const capas = useCapas();

  async function onPick(lat: number, lng: number) {
    setModoMapa(false);
    setUbicacion({ lat, lng, direccion: 'Obteniendo dirección…' });
    setUbicacion({ lat, lng, direccion: await reverseGeocode(lat, lng) });
  }

  const contenido = (
    <>
      <PanelSection title="Nuevo reporte ciudadano">
        <ReporteForm
          ubicacion={ubicacion}
          onUbicacion={setUbicacion}
          modoMapa={modoMapa}
          onToggleModoMapa={() => setModoMapa((m) => !m)}
          onCreado={(r) => {
            setCreado(r);
            setFoco(r);
          }}
        />
      </PanelSection>

      {creado ? (
        <PanelSection title="Reporte enviado">
          <div className="-mx-3">
            <ReporteItem reporte={creado} onIr={setFoco} />
          </div>
        </PanelSection>
      ) : null}

      <PanelSection title="Reportes anteriores">
        <Link
          to="/reportes/historial"
          className="flex items-center justify-center gap-2 rounded-control border border-border py-2 text-xs font-bold text-fg-muted transition duration-fast ease-out hover:bg-surface-raised hover:text-fg"
        >
          <History className="h-4 w-4" aria-hidden="true" /> Ver historial ({reportes.length})
        </Link>
      </PanelSection>
    </>
  );

  return (
    // El mapa manda incluso en móvil: ahí se elige la ubicación del reporte.
    // El formulario vive en el cajón inferior, igual que en Candidatos/Rutas.
    <div className="relative flex h-full">
      <aside className="scrollbar-slim flex w-96 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface max-md:hidden">
        {contenido}
      </aside>

      <div className="relative min-w-0 flex-1">
        <MapCanvas zoomPosition="bottomright">
          <ReportesLayer reportes={reportes} onSelect={setFoco} />
          <CapasLayers activas={capas.activas} />
          <UbicacionPicker activo={modoMapa} onPick={(lat, lng) => void onPick(lat, lng)} />
          {ubicacion ? <UbicacionTemporal lat={ubicacion.lat} lng={ubicacion.lng} /> : null}
          {foco?.lat != null && foco.lng != null ? (
            <FlyTo lat={foco.lat} lng={foco.lng} zoom={17} />
          ) : null}
        </MapCanvas>

        {/* Overlays consistentes en todas las vistas del mapa: capas
            arriba-derecha, simbología abajo-izquierda. */}
        <div className="absolute right-3 top-3 z-panel">
          <CapasToggles activas={capas.activas} onToggle={capas.alternar} />
        </div>
        <Simbologia capas={capas.activas} />

        {modoMapa ? (
          <div className="absolute left-1/2 top-3 z-panel -translate-x-1/2 rounded-full bg-warning px-3 py-1 text-xs2 font-bold text-white shadow-overlay">
            Haz clic en el mapa para ubicar el reporte
          </div>
        ) : null}
      </div>

      <BottomSheet className="md:hidden" title="Nuevo reporte">
        {contenido}
      </BottomSheet>
    </div>
  );
}
