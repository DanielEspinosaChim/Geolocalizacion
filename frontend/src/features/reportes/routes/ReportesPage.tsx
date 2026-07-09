import { useState } from 'react';
import { EmptyState, MapCanvas, SelectField, Spinner } from '@shared/ui';
import { reverseGeocode } from '../api/reverseGeocode';
import { useReportes } from '../api/useReportes';
import { FlyTo } from '../components/FlyToReporte';
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
      <aside className="flex w-full flex-col overflow-y-auto border-r border-border bg-surface md:w-96">
        <ReporteForm
          ubicacion={ubicacion}
          onUbicacion={setUbicacion}
          modoMapa={modoMapa}
          onToggleModoMapa={() => setModoMapa((m) => !m)}
        />
        <ListaReportes
          reportes={reportes}
          isPending={isPending}
          filtroStatus={filtroStatus}
          onFiltroStatus={setFiltroStatus}
          onIr={setFoco}
        />
      </aside>
      <div className="relative hidden flex-1 md:block">
        <MapCanvas>
          <ReportesLayer reportes={reportes} onSelect={setFoco} />
          <UbicacionPicker activo={modoMapa} onPick={(lat, lng) => void onPick(lat, lng)} />
          {ubicacion ? <UbicacionTemporal lat={ubicacion.lat} lng={ubicacion.lng} /> : null}
          {foco?.lat != null && foco.lng != null ? <FlyTo lat={foco.lat} lng={foco.lng} /> : null}
        </MapCanvas>
        {modoMapa ? (
          <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-warning px-3 py-1 text-[11px] font-bold text-white shadow-lg">
            Haz clic en el mapa para ubicar el reporte
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ListaReportes({
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
    <>
      <div className="border-b border-border p-3">
        <SelectField
          label="Filtrar por estado"
          value={filtroStatus ?? ''}
          onChange={(e) => onFiltroStatus((e.target.value || null) as StatusReporte | null)}
        >
          <option value="">Todos</option>
          {STATUS_REPORTE.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </SelectField>
      </div>
      {isPending ? (
        <div className="flex justify-center p-6">
          <Spinner label="Cargando reportes…" />
        </div>
      ) : reportes.length === 0 ? (
        <EmptyState title="No hay reportes registrados." className="p-4" />
      ) : (
        reportes.map((r) => <ReporteItem key={r.id} reporte={r} onIr={onIr} />)
      )}
    </>
  );
}
