import { MapPin, Pencil, Store, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Checkbox, DateField, EmptyState, IconButton } from '@shared/ui';
import { usePatchNegocio } from '../api/useNegocioMutations';
import { toneVerificacion } from '../model/campana';
import type { NegocioCampana } from '../model/campana';

interface NegociosGridProps {
  campanaId: string;
  negocios: NegocioCampana[];
  onRegistrar: (negocio: NegocioCampana) => void;
}

/**
 * Negocios de la campaña como tarjetas en rejilla (vista admin), como en el
 * legacy. Cada tarjeta: marcar visitado, registrar/editar la visita, fijar la
 * fecha y quitarlo. Sustituyó a la tabla, que en pantallas anchas dejaba las
 * acciones muy lejos del nombre.
 */
export function NegociosGrid({ campanaId, negocios, onRegistrar }: NegociosGridProps) {
  if (negocios.length === 0) {
    return (
      <EmptyState
        className="py-16"
        icon={<Store className="h-10 w-10 opacity-40" aria-hidden="true" />}
        title="Sin negocios aún. Usa «Agregar negocio»."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {negocios.map((n) => (
        <NegocioCard
          key={n.negocio_id}
          negocio={n}
          campanaId={campanaId}
          onRegistrar={() => onRegistrar(n)}
        />
      ))}
    </div>
  );
}

const TONE_TEXT = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;

function NegocioCard({
  negocio: n,
  campanaId,
  onRegistrar,
}: {
  negocio: NegocioCampana;
  campanaId: string;
  onRegistrar: () => void;
}) {
  const patch = usePatchNegocio(campanaId);

  return (
    // `min-w-0`: sin él, un nombre largo agranda su columna del grid (el mínimo
    // de una pista es `auto`) y la tarjeta se sale de la fila.
    <Card raised className="grid min-w-0 content-start gap-3 p-3">
      <div className="flex items-start gap-2.5">
        <Checkbox
          className="mt-0.5 shrink-0"
          checked={n.completado}
          onChange={(e) =>
            patch.mutate({ negocioId: n.negocio_id, updates: { completado: e.target.checked } })
          }
          aria-label={`Marcar ${n.nombre} como visitado`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold" title={n.nombre}>
            {n.nombre}
          </div>
          <div className="text-2xs text-fg-muted">{n.tipo ?? 'informal'}</div>
          {n.completado ? (
            <Badge tone="success" className="mt-1">
              Visitado
            </Badge>
          ) : null}
          {n.visita_distancia != null ? (
            <div
              className={`mt-1 flex items-center gap-1 text-2xs font-semibold ${
                TONE_TEXT[toneVerificacion(n.visita_distancia)]
              }`}
            >
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {n.visita_direccion ?? ''} · a {n.visita_distancia} m
              </span>
            </div>
          ) : null}
        </div>
        <MiniaturaVisita negocio={n} />
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onRegistrar}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> {n.completado ? 'Editar' : 'Registrar'}
        </Button>
        <DateField
          size="sm"
          className="w-32 shrink-0"
          value={n.fecha_visita ?? ''}
          onChange={(e) =>
            patch.mutate({ negocioId: n.negocio_id, updates: { fecha_visita: e.target.value } })
          }
          aria-label={`Fecha de visita de ${n.nombre}`}
        />
        <IconButton
          variant="danger"
          size="sm"
          icon={Trash2}
          label={`Quitar ${n.nombre} de la campaña`}
          onClick={() => patch.mutate({ negocioId: n.negocio_id, updates: { _quitar: true } })}
        />
      </div>
    </Card>
  );
}

/** Miniatura de la foto de la visita: negocio, o la única foto de visitas viejas. */
function MiniaturaVisita({ negocio: n }: { negocio: NegocioCampana }) {
  const url = n.foto_negocio_url ?? n.foto_visita_url ?? n.foto_local_url;
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
      <img
        src={url}
        alt={`Foto de la visita a ${n.nombre}`}
        className="h-12 w-12 rounded-control border border-border object-cover text-2xs text-fg-subtle"
      />
    </a>
  );
}
