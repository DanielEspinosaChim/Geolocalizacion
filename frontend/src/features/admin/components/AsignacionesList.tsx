import { UserCheck, UserX } from 'lucide-react';
import { Combobox, EmptyState } from '@shared/ui';
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
  const opciones = tecnicos.map((t) => ({ value: t.uid, label: t.nombre || t.email }));

  if (campanas.length === 0) {
    return (
      <EmptyState title="No hay campañas." hint="Créalas en la pestaña Campañas." className="py-10" />
    );
  }

  return (
    <div className="divide-y divide-border rounded-card border border-border">
      {campanas.map((c) => {
        const { pct, hecho, total } = progresoDe(c);
        const asignada = Boolean(c.asignado_a);
        const Icono = asignada ? UserCheck : UserX;
        return (
          <div key={c.id} className="flex items-center gap-3 p-3">
            <Icono
              className={`h-4 w-4 shrink-0 ${asignada ? 'text-success' : 'text-fg-subtle'}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{c.nombre}</div>
              <div className="text-xs2 text-fg-muted">
                {c.colonia ?? 'Sin colonia'} · {hecho}/{total} ({pct}%)
              </div>
            </div>
            <div className="w-48 shrink-0">
              <Combobox
                size="sm"
                aria-label={`Técnico asignado a ${c.nombre}`}
                placeholder="Sin asignar"
                options={opciones}
                value={c.asignado_a ?? null}
                onChange={(uid) => asignar.mutate({ campanaId: c.id, uid })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
