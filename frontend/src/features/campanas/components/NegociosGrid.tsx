import { Check, MapPin, Pencil, Store, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Checkbox, DateField, EmptyState, IconButton } from '@shared/ui';
import { usePatchNegocio } from '../api/useNegocioMutations';
import { toneVerificacion } from '../model/campana';
import type { NegocioCampana } from '../model/campana';

interface NegociosGridProps {
  campanaId: string;
  negocios: NegocioCampana[];
  /** Campaña finalizada: todas sus tarjetas se ven atenuadas (archivadas). */
  finalizada?: boolean;
  onRegistrar: (negocio: NegocioCampana) => void;
}

/**
 * Negocios de la campaña como tarjetas en rejilla (vista admin). Cada tarjeta:
 * marcar visitado, registrar/editar la visita, fijar fecha y quitarlo. Las ya
 * visitadas (o todas, si la campaña está finalizada) se atenúan.
 */
export function NegociosGrid({ campanaId, negocios, finalizada = false, onRegistrar }: NegociosGridProps) {
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {negocios.map((n) => (
        <NegocioCard
          key={n.negocio_id}
          negocio={n}
          campanaId={campanaId}
          atenuada={finalizada}
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
  atenuada,
  onRegistrar,
}: {
  negocio: NegocioCampana;
  campanaId: string;
  atenuada: boolean;
  onRegistrar: () => void;
}) {
  const patch = usePatchNegocio(campanaId);
  const visitado = n.completado;
  // La tarjeta se apaga si ya se visitó o si la campaña está finalizada.
  const apagada = visitado || atenuada;

  return (
    // `min-w-0`: un nombre largo no debe estirar la columna del grid.
    // Acento izquierdo verde al visitar; la tarjeta apagada baja opacidad.
    <Card
      className={`relative grid min-w-0 content-start gap-3 overflow-hidden p-4 shadow-card transition-opacity ${
        apagada ? 'opacity-60' : ''
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${visitado ? 'bg-success' : 'bg-secondary/40'}`}
      />

      <div className="flex items-start gap-2.5">
        <Checkbox
          className="mt-0.5 shrink-0"
          checked={visitado}
          onChange={(e) =>
            patch.mutate({ negocioId: n.negocio_id, updates: { completado: e.target.checked } })
          }
          aria-label={`Marcar ${n.nombre} como visitado`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold" title={n.nombre}>
            {n.nombre}
          </div>
          <div className="text-2xs uppercase tracking-wide text-fg-subtle">{n.tipo ?? 'informal'}</div>
          {visitado ? (
            <Badge tone="success" className="mt-1.5">
              <Check className="h-3 w-3" aria-hidden="true" /> Visitado
            </Badge>
          ) : null}
          {n.visita_distancia != null ? (
            <div
              className={`mt-1.5 flex items-center gap-1 text-2xs font-semibold ${
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
          <Pencil className="h-4 w-4" aria-hidden="true" /> {visitado ? 'Editar' : 'Registrar'}
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
