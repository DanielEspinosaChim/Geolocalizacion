import { progresoDe, type Campana } from '@features/campanas';
import { Badge, SelectField } from '@shared/ui';
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
    return <p className="p-4 text-center text-xs text-fg-muted">No hay campañas. Créalas en la pestaña Campañas.</p>;
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
              <SelectField
                label=""
                value={c.asignado_a ?? ''}
                onChange={(e) => asignar.mutate({ campanaId: c.id, uid: e.target.value || null })}
                className="py-1 text-xs"
              >
                <option value="">Sin asignar</option>
                {tecnicos.map((t) => (
                  <option key={t.uid} value={t.uid}>
                    {t.nombre || t.email}
                  </option>
                ))}
              </SelectField>
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
