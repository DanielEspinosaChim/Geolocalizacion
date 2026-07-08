import { Badge, Button } from '@shared/ui';
import { useEliminarReporte } from '../api/useReportes';
import { useResolverConGPS } from '../hooks/useResolverConGPS';
import { REPORTE_META, STATUS_META, toneVerificacion, type Reporte } from '../model/reporte';

const TONE_TEXT = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

interface ReporteItemProps {
  reporte: Reporte;
  onIr: (r: Reporte) => void;
}

export function ReporteItem({ reporte: r, onIr }: ReporteItemProps) {
  const meta = REPORTE_META[r.tipo];
  const status = STATUS_META[r.status];
  const { avanzar, isPending } = useResolverConGPS();
  const eliminar = useEliminarReporte();

  return (
    <article className="grid gap-1.5 border-b border-border p-3">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <span className="text-lg" aria-hidden="true">{meta.emoji}</span> {meta.label}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>
      <p className="truncate text-[11px] text-fg-muted">{r.descripcion || r.direccion || 'Sin descripción'}</p>
      <p className="text-[10px] text-fg-subtle">{(r.fecha ?? '').slice(0, 10)}</p>
      {r.foto_url ? (
        <a href={r.foto_url} target="_blank" rel="noreferrer">
          <img src={r.foto_url} alt={`Foto del reporte de ${meta.label}`} className="max-h-36 w-full rounded-control object-cover" />
        </a>
      ) : null}
      {r.status === 'resuelto' && r.verificado_distancia != null ? (
        <p className={`text-[11px] font-semibold ${TONE_TEXT[toneVerificacion(r.verificado_distancia)]}`}>
          📍 Verificado a {r.verificado_distancia} m
          {r.verificado_fecha ? ` · ${r.verificado_fecha.slice(0, 10)}` : ''}
        </p>
      ) : null}
      <div className="flex gap-1.5">
        {r.status !== 'resuelto' ? (
          <Button variant="secondary" disabled={isPending} onClick={() => void avanzar(r)} className="flex-1 px-2 py-1 text-[11px]">
            {r.status === 'pendiente' ? '▶ En proceso' : '✓ Resolver'}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => onIr(r)} className="px-2 py-1 text-[11px]" aria-label="Ver en el mapa">
          📍
        </Button>
        <Button
          variant="ghost"
          disabled={eliminar.isPending}
          onClick={() => {
            if (window.confirm('¿Eliminar este reporte?')) eliminar.mutate(r.id);
          }}
          className="px-2 py-1 text-[11px] text-danger"
          aria-label="Eliminar reporte"
        >
          🗑
        </Button>
      </div>
    </article>
  );
}
