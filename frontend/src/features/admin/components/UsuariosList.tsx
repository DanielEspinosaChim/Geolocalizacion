import type { Role } from '@core/auth';
import type { Campana } from '@features/campanas';
import { Button, SelectField, toast } from '@shared/ui';
import { useUsuarioMutations, useUsuarios } from '../api/useUsuarios';
import type { Usuario } from '../model/usuario';

interface UsuariosListProps {
  campanas: Campana[];
}

export function UsuariosList({ campanas }: UsuariosListProps) {
  const { data: usuarios = [] } = useUsuarios();
  const { cambiarRole, toggle, eliminar } = useUsuarioMutations();

  /** Campañas asignadas a un uid — bloquea deshabilitar/eliminar (paridad legacy). */
  function asignadas(uid: string): string[] {
    return campanas.filter((c) => c.asignado_a === uid).map((c) => c.nombre);
  }

  function intentar(uid: string, accion: () => void) {
    const nombres = asignadas(uid);
    if (nombres.length) {
      toast.error(`Tiene campañas asignadas (${nombres.join(', ')}). Desasígnalo primero.`);
      return;
    }
    accion();
  }

  return (
    <div className="divide-y divide-border rounded-card border border-border">
      {usuarios.map((u) => (
        <UsuarioRow
          key={u.uid}
          usuario={u}
          onRole={(role) => cambiarRole.mutate({ uid: u.uid, role })}
          onToggle={() =>
            intentar(u.uid, () => toggle.mutate({ uid: u.uid, disabled: !u.disabled }))
          }
          onEliminar={() =>
            intentar(u.uid, () => {
              if (window.confirm(`¿Eliminar a ${u.email}? No se puede deshacer.`)) {
                eliminar.mutate(u.uid);
              }
            })
          }
        />
      ))}
      {usuarios.length === 0 ? <p className="p-4 text-center text-xs text-fg-muted">Sin usuarios.</p> : null}
    </div>
  );
}

function UsuarioRow({
  usuario: u,
  onRole,
  onToggle,
  onEliminar,
}: {
  usuario: Usuario;
  onRole: (role: Role) => void;
  onToggle: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 ${u.disabled ? 'opacity-40' : ''}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-sm font-bold text-fg-muted">
        {(u.nombre || u.email)[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{u.nombre || '—'}</div>
        <div className="truncate text-[11px] text-fg-muted">{u.email}</div>
      </div>
      <SelectField label="" value={u.role} onChange={(e) => onRole(e.target.value as Role)} className="py-1 text-xs">
        <option value="tecnico">Técnico</option>
        <option value="admin">Admin</option>
      </SelectField>
      <Button variant="secondary" onClick={onToggle} className="px-2 py-1 text-[11px]">
        {u.disabled ? '✓ Habilitar' : '✗ Deshabilitar'}
      </Button>
      <Button variant="ghost" onClick={onEliminar} className="px-2 py-1 text-[11px] text-danger">
        Eliminar
      </Button>
    </div>
  );
}
