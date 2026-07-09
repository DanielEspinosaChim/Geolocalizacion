import { Clock, FileText, MapPin, Ruler } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@shared/ui';
import { descargarReporteVisita } from '../api/useRuta';
import { formatearTiempo, type RutaCalculada } from '../model/ruta';

/** Resumen de la ruta calculada: stats, orden de visita y descarga de reporte. */
export function RutaInfo({ ruta }: { ruta: RutaCalculada }) {
  const [descargando, setDescargando] = useState(false);
  const placeIds = ruta.waypoints_ordenados
    .map((p) => p.place_id)
    .filter((id): id is string => Boolean(id) && id !== '__origen__');

  async function descargar() {
    setDescargando(true);
    try {
      await descargarReporteVisita(placeIds);
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="grid gap-2 border-t border-border p-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { Icon: Ruler, label: 'Distancia', valor: `${ruta.distancia_km} km` },
          { Icon: Clock, label: 'Tiempo', valor: formatearTiempo(ruta.tiempo_min) },
          { Icon: MapPin, label: 'Paradas', valor: String(ruta.waypoints_ordenados.length) },
        ].map(({ Icon, label, valor }) => (
          <div key={label} className="rounded-control border border-border bg-surface-raised p-2">
            <div className="flex items-center justify-center gap-1 text-2xs text-fg-subtle">
              <Icon className="h-3 w-3" aria-hidden="true" /> {label}
            </div>
            <div className="text-sm font-extrabold tabular-nums">{valor}</div>
          </div>
        ))}
      </div>
      <Button variant="secondary" full disabled={descargando} onClick={() => void descargar()}>
        <FileText className="h-4 w-4" aria-hidden="true" />{' '}
        {descargando ? 'Generando…' : 'Descargar reporte de visita'}
      </Button>
      <p className="text-[10px] text-fg-subtle">Ruta optimizada · En auto · Sin tráfico en tiempo real</p>
      <div className="max-h-44 overflow-y-auto">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-fg-subtle">
          Orden de visita
        </div>
        {ruta.waypoints_ordenados.map((p, i) => (
          <div key={`${p.place_id ?? i}`} className="flex items-center gap-2 py-0.5 text-xs">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-strong text-[10px] font-bold text-primary-fg">
              {i + 1}
            </span>
            <span className="truncate">{p.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
