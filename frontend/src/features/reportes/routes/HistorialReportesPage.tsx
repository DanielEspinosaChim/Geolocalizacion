import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { BottomSheet, Combobox, EmptyState, FlyTo, MapCanvas, PanelSection, Spinner } from '@shared/ui';
import { useReportes } from '../api/useReportes';
import { ReporteItem } from '../components/ReporteItem';
import { ReportesLayer } from '../components/ReportesLayer';
import { STATUS_META, STATUS_REPORTE, type Reporte, type StatusReporte } from '../model/reporte';

/**
 * Todos los reportes registrados. Vive aparte de la vista de alta para que el
 * historial no se acumule bajo el formulario: allí solo se ve el recién creado.
 *
 * Misma estructura map-first que Reportes/Candidatos: en móvil el mapa manda y
 * la lista va en el cajón inferior (ocultable), no en una lista a pantalla
 * completa que tapaba el mapa sin salida.
 */
export function HistorialReportesPage() {
  const [filtroStatus, setFiltroStatus] = useState<StatusReporte | null>(null);
  const { data: reportes = [], isPending } = useReportes(filtroStatus);
  const [foco, setFoco] = useState<Reporte | null>(null);

  const contenido = (
    <PanelSection
      title="Historial de reportes"
      action={
        isPending ? null : (
          <span className="text-2xs tabular-nums text-fg-subtle">{reportes.length}</span>
        )
      }
    >
      <Link
        to="/reportes"
        className="flex items-center justify-center gap-2 rounded-control border border-border py-2 text-xs font-bold text-fg-muted transition duration-fast ease-out hover:bg-surface-raised hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a crear un reporte
      </Link>

      <Combobox
        aria-label="Filtrar reportes por estado"
        placeholder="Todos los estados"
        options={STATUS_REPORTE.map((s) => ({ value: s, label: STATUS_META[s].label }))}
        value={filtroStatus}
        onChange={(s) => setFiltroStatus(s as StatusReporte | null)}
      />

      {isPending ? (
        <div className="flex justify-center py-6">
          <Spinner label="Cargando reportes…" />
        </div>
      ) : reportes.length === 0 ? (
        <EmptyState
          title="No hay reportes con este filtro."
          hint="Prueba con otro estado."
          className="py-6"
        />
      ) : (
        <div className="-mx-3 border-t border-border">
          {reportes.map((r) => (
            <ReporteItem key={r.id} reporte={r} onIr={setFoco} />
          ))}
        </div>
      )}
    </PanelSection>
  );

  return (
    <div className="relative flex h-full">
      <aside className="scrollbar-slim flex w-96 shrink-0 flex-col overflow-y-auto border-r border-border bg-surface max-md:hidden">
        {contenido}
      </aside>

      <div className="relative min-w-0 flex-1">
        <MapCanvas>
          <ReportesLayer reportes={reportes} onSelect={setFoco} />
          {foco?.lat != null && foco.lng != null ? (
            <FlyTo lat={foco.lat} lng={foco.lng} zoom={17} />
          ) : null}
        </MapCanvas>
      </div>

      <BottomSheet className="md:hidden" title="Historial de reportes">
        {contenido}
      </BottomSheet>
    </div>
  );
}
