import { Badge, Button } from '@shared/ui';
import { usePatchNegocio } from '../api/useNegocioMutations';
import type { NegocioCampana } from '../model/campana';

interface NegociosTablaProps {
  campanaId: string;
  negocios: NegocioCampana[];
  onRegistrar: (negocio: NegocioCampana) => void;
}

/** Tabla de negocios (vista admin): toggle visitado, fecha y quitar. */
export function NegociosTabla({ campanaId, negocios, onRegistrar }: NegociosTablaProps) {
  const patch = usePatchNegocio(campanaId);

  if (negocios.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-fg-muted">
        <span className="text-4xl opacity-40">🏪</span>
        <p>Sin negocios aún. Usa «+ Agregar negocio».</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {negocios.map((n) => (
        <div key={n.negocio_id} className="grid gap-2 rounded-card border border-border bg-surface-raised p-3">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={n.completado}
              onChange={(e) =>
                patch.mutate({ negocioId: n.negocio_id, updates: { completado: e.target.checked } })
              }
              className="mt-1 h-4 w-4 accent-primary"
              aria-label={`Marcar ${n.nombre} como visitado`}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{n.nombre}</div>
              <div className="text-[10px] text-fg-muted">{n.tipo ?? 'informal'}</div>
              {n.completado ? <Badge tone="success">✓ Visitado</Badge> : null}
              {n.visita_distancia != null ? (
                <div className="mt-1 text-[10px] text-fg-subtle">
                  📍 {n.visita_direccion ?? ''} · a {n.visita_distancia} m
                </div>
              ) : null}
            </div>
            {n.foto_visita_url ? (
              <a href={n.foto_visita_url} target="_blank" rel="noreferrer">
                <img src={n.foto_visita_url} alt="Foto de la visita" className="h-12 w-12 rounded-control object-cover" />
              </a>
            ) : null}
          </div>
          <div className="flex items-center gap-2 border-t border-border pt-2">
            <Button variant="secondary" onClick={() => onRegistrar(n)} className="flex-1 py-1.5 text-[11px]">
              📝 {n.completado ? 'Editar' : 'Registrar'}
            </Button>
            <input
              type="date"
              value={n.fecha_visita ?? ''}
              onChange={(e) =>
                patch.mutate({ negocioId: n.negocio_id, updates: { fecha_visita: e.target.value } })
              }
              className="rounded-control border border-border bg-bg px-2 py-1 text-[11px]"
              aria-label="Fecha de visita"
            />
            <Button
              variant="ghost"
              onClick={() => patch.mutate({ negocioId: n.negocio_id, updates: { _quitar: true } })}
              className="px-2 py-1 text-[11px] text-danger"
              aria-label="Quitar de la campaña"
            >
              🗑
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
