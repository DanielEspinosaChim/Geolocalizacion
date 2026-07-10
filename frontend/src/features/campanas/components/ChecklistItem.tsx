import { Car, MapPin, Pencil, Undo2 } from 'lucide-react';
import { Button } from '@shared/ui';
import { usePatchNegocio } from '../api/useNegocioMutations';
import type { NegocioCampana } from '../model/campana';

function navUrls(n: NegocioCampana) {
  const query = encodeURIComponent(`${n.nombre}${n.colonia ? ` ${n.colonia}` : ''} Mérida Yucatán`);
  const tieneCoords = n.lat != null && n.lng != null;
  return {
    maps: tieneCoords
      ? `https://www.google.com/maps/search/?api=1&query=${n.lat},${n.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`,
    waze: tieneCoords
      ? `https://waze.com/ul?ll=${n.lat},${n.lng}&navigate=yes`
      : `https://waze.com/ul?q=${query}&navigate=yes`,
  };
}

function lineaMeta(n: NegocioCampana): string {
  const partes = n.completado
    ? [n.fecha_visita ? `✓ ${n.fecha_visita}` : '', n.notas ?? '']
    : [n.tipo ?? 'informal', n.colonia ?? n.direccion ?? ''];
  return partes.filter(Boolean).join('  ·  ');
}

interface ChecklistItemProps {
  campanaId: string;
  negocio: NegocioCampana;
  onRegistrar: (n: NegocioCampana) => void;
}

/** Item del checklist de campo del técnico. */
export function ChecklistItem({ campanaId, negocio: n, onRegistrar }: ChecklistItemProps) {
  const patch = usePatchNegocio(campanaId);
  const visitado = n.completado;
  const urls = navUrls(n);

  return (
    <div className={`grid gap-2 border-b border-border px-4 py-3 ${visitado ? 'bg-surface/50' : ''}`}>
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${visitado ? 'bg-success' : 'bg-warning'}`}
        />
        <div className="min-w-0 flex-1">
          <div className={`truncate text-sm font-bold ${visitado ? 'text-fg-muted line-through' : ''}`}>
            {n.nombre}
          </div>
          <div className="truncate text-xs2 text-fg-muted">{lineaMeta(n)}</div>
        </div>
        {visitado && n.foto_visita_url ? (
          <a href={n.foto_visita_url} target="_blank" rel="noreferrer">
            <img src={n.foto_visita_url} alt="Foto de la visita" className="h-10 w-10 rounded-control object-cover" />
          </a>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 pl-5">
        <div className="flex items-center gap-1.5">
          <div className="flex shrink-0 items-center overflow-hidden rounded-control border border-border">
            <a href={urls.maps} target="_blank" rel="noreferrer" className="flex items-center gap-1 border-r border-border px-2.5 py-1.5 text-xs2 font-semibold text-primary transition-colors hover:bg-primary/10">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Maps
            </a>
            {/* eslint-disable-next-line no-restricted-syntax -- cian de marca de Waze, color de tercero (no es token de tema) */}
            <a href={urls.waze} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 text-xs2 font-semibold text-[#33ccff] transition-colors hover:bg-[#33ccff]/10">
              <Car className="h-3.5 w-3.5" aria-hidden="true" /> Waze
            </a>
          </div>

          {!visitado ? (
            <Button size="sm" onClick={() => onRegistrar(n)} className="flex-1">
              <Pencil className="h-4 w-4" aria-hidden="true" /> Registrar visita
            </Button>
          ) : null}
        </div>

        {visitado ? (
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => patch.mutate({ negocioId: n.negocio_id, updates: { completado: false, fecha_visita: '' } })}
              className="flex-1 border-danger/30 text-danger hover:bg-danger/10"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" /> Pendiente
            </Button>
            <Button variant="outline" size="sm" onClick={() => onRegistrar(n)} className="flex-1">
              <Pencil className="h-4 w-4" aria-hidden="true" /> Editar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
