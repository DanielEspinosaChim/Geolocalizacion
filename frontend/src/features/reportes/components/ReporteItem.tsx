import { Check, MapPin, Play, Trash2 } from 'lucide-react';
import { Badge, Button, IconButton, useConfirm } from '@shared/ui';
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
  const confirm = useConfirm();

  return (
    <article className="grid gap-1.5 border-b border-border p-3">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <span className="text-lg" aria-hidden="true">{meta.emoji}</span> {meta.label}
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>
      <p className="truncate text-xs2 text-fg-muted">{r.descripcion || r.direccion || 'Sin descripción'}</p>
      <p className="text-2xs text-fg-subtle">{(r.fecha ?? '').slice(0, 10)}</p>
      {r.foto_url ? (
        <a href={r.foto_url} target="_blank" rel="noreferrer">
          <img src={r.foto_url} alt={`Foto del reporte de ${meta.label}`} className="max-h-36 w-full rounded-control object-cover" />
        </a>
      ) : null}
      {r.status === 'resuelto' && r.verificado_distancia != null ? (
        <p className={`flex items-center gap-1 text-xs2 font-semibold ${TONE_TEXT[toneVerificacion(r.verificado_distancia)]}`}>
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /> Verificado a {r.verificado_distancia} m
          {r.verificado_fecha ? ` · ${r.verificado_fecha.slice(0, 10)}` : ''}
        </p>
      ) : null}
      <div className="flex gap-1.5">
        {r.status !== 'resuelto' ? (
          <Button variant="secondary" size="sm" disabled={isPending} onClick={() => void avanzar(r)} className="flex-1">
            {r.status === 'pendiente' ? (
              <>
                <Play className="h-4 w-4" aria-hidden="true" /> En proceso
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> Resolver
              </>
            )}
          </Button>
        ) : null}
        <IconButton variant="ghost" size="sm" icon={MapPin} label="Ver en el mapa" onClick={() => onIr(r)} />
        <IconButton
          variant="danger"
          size="sm"
          icon={Trash2}
          label="Eliminar reporte"
          disabled={eliminar.isPending}
          onClick={() =>
            void confirm({
              title: 'Eliminar reporte',
              description: 'Se eliminará este reporte.',
              tone: 'danger',
              confirmLabel: 'Eliminar',
            }).then((ok) => ok && eliminar.mutate(r.id))
          }
        />
      </div>
    </article>
  );
}
