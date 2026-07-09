import { Badge, Combobox, EmptyState } from '@shared/ui';
import { progresoDe, type Campana } from '@features/campanas';
import { useAsignarCampana } from '../api/useAsignarCampana';
import type { Usuario } from '../model/usuario';

interface AsignacionesListProps {
  campanas: Campana[];
  usuarios: Usuario[];
}

export function AsignacionesList({ campanas, usuarios }: AsignacionesListProps) {
  const asignar = useAsignarCampana();
  const tecnicos = usuarios.filter((u) => u.role === 'tecnico' && !u.disabled);

  if (campanas.length === 0) {
    return <EmptyState title="No hay campañas." hint="Créalas en la pestaña Campañas." className="p-4" />;
  }

  return (
    <div className="divide-y divide-border rounded-card border border-border">
      {campanas.map((c) => {
        const { pct, hecho, total } = progresoDe(c);
        return (
          <div key={c.id} className="grid gap-2 p-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{c.nombre}</div>
                <div className="text-[11px] text-fg-muted">
                  {c.colonia ?? 'Sin colonia'} · {hecho}/{total} ({pct}%)
                </div>
              </div>
              <div className="w-44 shrink-0">
                <Combobox
                  size="sm"
                  aria-label={`Técnico asignado a ${c.nombre}`}
                  placeholder="Sin asignar"
                  options={tecnicos.map((t) => ({ value: t.uid, label: t.nombre || t.email }))}
                  value={c.asignado_a ?? null}
                  onChange={(uid) => asignar.mutate({ campanaId: c.id, uid })}
                />
              </div>
            </div>
            {c.asignado_nombre ? (
              <Badge tone="info">Asignada a: {c.asignado_nombre}</Badge>
            ) : (
              <Badge tone="neutral">Sin técnico asignado</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
