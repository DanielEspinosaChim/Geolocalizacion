import { useState } from 'react';
import { EmptyState, FlyTo, MapCanvas, PanelSection, SelectField, Spinner } from '@shared/ui';
import { reverseGeocode } from '../api/reverseGeocode';
import { useReportes } from '../api/useReportes';
import { ReporteForm, type Ubicacion } from '../components/ReporteForm';
import { ReporteItem } from '../components/ReporteItem';
import { ReportesLayer, UbicacionPicker, UbicacionTemporal } from '../components/ReportesLayer';
import { STATUS_META, STATUS_REPORTE, type Reporte, type StatusReporte } from '../model/reporte';

export function ReportesPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusReporte | null>(null);
  const { data: reportes = [], isPending } = useReportes(filtroStatus);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [modoMapa, setModoMapa] = useState(false);
  const [foco, setFoco] = useState<Reporte | null>(null);

  async function onPick(lat: number, lng: number) {
    setModoMapa(false);
    setUbicacion({ lat, lng, direccion: 'Obteniendo dirección…' });
    setUbicacion({ lat, lng, direccion: await reverseGeocode(lat, lng) });
  }

  return (
    <div className="flex h-full">
      <aside className="scrollbar-slim flex w-full flex-col overflow-y-auto border-r border-border bg-surface md:w-96">
        <Historial
          reportes={reportes}
          isPending={isPending}
          filtroStatus={filtroStatus}
          onFiltroStatus={setFiltroStatus}
          onIr={setFoco}
        />
        <PanelSection title="Nuevo reporte ciudadano">
          <ReporteForm
            ubicacion={ubicacion}
            onUbicacion={setUbicacion}
            modoMapa={modoMapa}
            onToggleModoMapa={() => setModoMapa((m) => !m)}
          />
        </PanelSection>
      </aside>

      <div className="relative hidden flex-1 md:block">
        <MapCanvas>
          <ReportesLayer reportes={reportes} onSelect={setFoco} />
          <UbicacionPicker activo={modoMapa} onPick={(lat, lng) => void onPick(lat, lng)} />
          {ubicacion ? <UbicacionTemporal lat={ubicacion.lat} lng={ubicacion.lng} /> : null}
          {foco?.lat != null && foco.lng != null ? (
            <FlyTo lat={foco.lat} lng={foco.lng} zoom={17} />
          ) : null}
        </MapCanvas>
        {modoMapa ? (
          <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-warning px-3 py-1 text-xs2 font-bold text-white shadow-overlay">
            Haz clic en el mapa para ubicar el reporte
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Historial({
  reportes,
  isPending,
  filtroStatus,
  onFiltroStatus,
  onIr,
}: {
  reportes: Reporte[];
  isPending: boolean;
  filtroStatus: StatusReporte | null;
  onFiltroStatus: (s: StatusReporte | null) => void;
  onIr: (r: Reporte) => void;
}) {
  return (
    <PanelSection
      title="Historial de reportes"
      action={
        isPending ? null : (
          <span className="text-2xs tabular-nums text-fg-subtle">{reportes.length}</span>
        )
      }
    >
      <SelectField
        label=""
        aria-label="Filtrar reportes por estado"
        value={filtroStatus ?? ''}
        onChange={(e) => onFiltroStatus((e.target.value || null) as StatusReporte | null)}
      >
        <option value="">Todos los estados</option>
        {STATUS_REPORTE.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </SelectField>

      {isPending ? (
        <div className="flex justify-center py-6">
          <Spinner label="Cargando reportes…" />
        </div>
      ) : reportes.length === 0 ? (
        <EmptyState
          title="No hay reportes registrados."
          hint="Crea el primero con el formulario de abajo."
          className="py-6"
        />
      ) : (
        /* -mx-3 sangra los items al borde del panel; el separador queda a todo lo ancho. */
        <div className="scrollbar-slim -mx-3 max-h-[26rem] overflow-y-auto border-t border-border">
          {reportes.map((r) => (
            <ReporteItem key={r.id} reporte={r} onIr={onIr} />
          ))}
        </div>
      )}
    </PanelSection>
  );
}
