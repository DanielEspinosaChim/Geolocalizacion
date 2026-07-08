import { useState } from 'react';
import type { SessionUser } from '@core/auth';
import { Badge, Button } from '@shared/ui';
import { CambiarPasswordModal } from './CambiarPasswordModal';

export function MiCuenta({ user }: { user: SessionUser }) {
  const [abierto, setAbierto] = useState(false);
  const esAdmin = user.role === 'admin';

  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface-raised p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
        {(user.email ?? '?')[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{user.email}</div>
        <Badge tone={esAdmin ? 'success' : 'warning'}>{esAdmin ? 'Admin' : 'Técnico'}</Badge>
      </div>
      <Button variant="secondary" onClick={() => setAbierto(true)} className="text-xs">
        Cambiar contraseña
      </Button>
      <CambiarPasswordModal open={abierto} onClose={() => setAbierto(false)} />
    </div>
  );
}
