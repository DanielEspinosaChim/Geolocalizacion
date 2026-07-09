import { Trash2 } from 'lucide-react';
import type { Role } from '@core/auth';
import {
  Button,
  Combobox,
  DataTable,
  EmptyState,
  IconButton,
  toast,
  useConfirm,
  type Column,
} from '@shared/ui';
import type { Campana } from '@features/campanas';
import { useUsuarioMutations, useUsuarios } from '../api/useUsuarios';
import { ROLES, type Usuario } from '../model/usuario';

interface UsuariosListProps {
  campanas: Campana[];
}

export function UsuariosList({ campanas }: UsuariosListProps) {
  const { data: usuarios = [], isPending } = useUsuarios();
  const { cambiarRole, toggle, eliminar } = useUsuarioMutations();
  const confirm = useConfirm();

  /** Bloquea deshabilitar/eliminar si el usuario tiene campañas (paridad legacy). */
  function intentar(uid: string, accion: () => void) {
    const nombres = campanas.filter((c) => c.asignado_a === uid).map((c) => c.nombre);
    if (nombres.length) {
      toast.error(`Tiene campañas asignadas (${nombres.join(', ')}). Desasígnalo primero.`);
      return;
    }
    accion();
  }

  function pedirEliminar(u: Usuario) {
    intentar(u.uid, () =>
      void confirm({
        title: 'Eliminar usuario',
        description: `Se eliminará a ${u.email}. No se puede deshacer.`,
        tone: 'danger',
        confirmLabel: 'Eliminar',
      }).then((ok) => ok && eliminar.mutate(u.uid)),
    );
  }

  const columns: Column<Usuario>[] = [
    { key: 'usuario', header: 'Usuario', cell: (u) => <UsuarioCelda usuario={u} /> },
    {
      key: 'rol',
      header: 'Rol',
      cell: (u) => (
        <div className="w-32">
          <Combobox
            size="sm"
            aria-label={`Rol de ${u.email}`}
            clearable={false}
            options={ROLES}
            value={u.role}
            onChange={(r) => r && cambiarRole.mutate({ uid: u.uid, role: r as Role })}
          />
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      className: 'text-right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => intentar(u.uid, () => toggle.mutate({ uid: u.uid, disabled: !u.disabled }))}
          >
            {u.disabled ? 'Habilitar' : 'Deshabilitar'}
          </Button>
          <IconButton variant="danger" size="sm" icon={Trash2} label={`Eliminar ${u.email}`} onClick={() => pedirEliminar(u)} />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={usuarios}
      rowKey={(u) => u.uid}
      loading={isPending}
      rowClassName={(u) => (u.disabled ? 'opacity-40' : '')}
      empty={<EmptyState title="Sin usuarios." className="p-4" />}
    />
  );
}

function UsuarioCelda({ usuario: u }: { usuario: Usuario }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-sm font-bold text-fg-muted">
        {(u.nombre || u.email)[0].toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{u.nombre || '—'}</div>
        <div className="truncate text-xs2 text-fg-muted">{u.email}</div>
      </div>
    </div>
  );
}
