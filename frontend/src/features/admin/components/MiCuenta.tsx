import { useState } from 'react';
import type { SessionUser } from '@core/auth';
import { Avatar, Badge, Button, Card } from '@shared/ui';
import { CambiarPasswordModal } from './CambiarPasswordModal';

export function MiCuenta({ user }: { user: SessionUser }) {
  const [abierto, setAbierto] = useState(false);
  const esAdmin = user.role === 'admin';

  return (
    <Card raised className="flex items-center gap-3 p-4">
      <Avatar nombre={user.email ?? '?'} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{user.email}</div>
        <Badge tone={esAdmin ? 'success' : 'warning'}>{esAdmin ? 'Admin' : 'Técnico'}</Badge>
      </div>
      <Button variant="secondary" size="sm" onClick={() => setAbierto(true)}>
        Cambiar contraseña
      </Button>
      <CambiarPasswordModal open={abierto} onClose={() => setAbierto(false)} />
    </Card>
  );
}
