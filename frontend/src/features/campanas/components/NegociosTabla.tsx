import { MapPin, Pencil, Store, Trash2 } from 'lucide-react';
import { Badge, Button, Checkbox, DataTable, EmptyState, IconButton, type Column } from '@shared/ui';
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

  const columns: Column<NegocioCampana>[] = [
    {
      key: 'check',
      header: '',
      className: 'w-8',
      cell: (n) => (
        <Checkbox
          checked={n.completado}
          onChange={(e) =>
            patch.mutate({ negocioId: n.negocio_id, updates: { completado: e.target.checked } })
          }
          aria-label={`Marcar ${n.nombre} como visitado`}
        />
      ),
    },
    { key: 'negocio', header: 'Negocio', cell: (n) => <NegocioCelda negocio={n} /> },
    {
      key: 'fecha',
      header: 'Fecha',
      cell: (n) => (
        <input
          type="date"
          value={n.fecha_visita ?? ''}
          onChange={(e) =>
            patch.mutate({ negocioId: n.negocio_id, updates: { fecha_visita: e.target.value } })
          }
          className="rounded-control border border-border bg-bg px-2 py-1 text-xs2"
          aria-label="Fecha de visita"
        />
      ),
    },
    {
      key: 'acciones',
      header: '',
      className: 'text-right',
      cell: (n) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => onRegistrar(n)}>
            <Pencil className="h-4 w-4" aria-hidden="true" /> {n.completado ? 'Editar' : 'Registrar'}
          </Button>
          <IconButton
            variant="danger"
            size="sm"
            icon={Trash2}
            label="Quitar de la campaña"
            onClick={() => patch.mutate({ negocioId: n.negocio_id, updates: { _quitar: true } })}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={negocios}
      rowKey={(n) => n.negocio_id}
      empty={
        <EmptyState
          className="p-10"
          icon={<Store className="h-10 w-10 opacity-40" aria-hidden="true" />}
          title="Sin negocios aún. Usa «Agregar negocio»."
        />
      }
    />
  );
}

function NegocioCelda({ negocio: n }: { negocio: NegocioCampana }) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{n.nombre}</div>
        <div className="text-2xs text-fg-muted">{n.tipo ?? 'informal'}</div>
        {n.completado ? <Badge tone="success">Visitado</Badge> : null}
        {n.visita_distancia != null ? (
          <div className="mt-1 flex items-center gap-1 text-2xs text-fg-subtle">
            <MapPin className="h-3 w-3" aria-hidden="true" /> {n.visita_direccion ?? ''} · a{' '}
            {n.visita_distancia} m
          </div>
        ) : null}
      </div>
      {n.foto_visita_url ? (
        <a href={n.foto_visita_url} target="_blank" rel="noreferrer">
          <img
            src={n.foto_visita_url}
            alt="Foto de la visita"
            className="h-12 w-12 rounded-control object-cover"
          />
        </a>
      ) : null}
    </div>
  );
}
