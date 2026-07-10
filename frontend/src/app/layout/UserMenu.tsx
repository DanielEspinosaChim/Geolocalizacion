import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { signOutUser, type SessionUser } from '@core/auth';
import { Avatar, Badge, IconButton } from '@shared/ui';

export function UserMenu({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';

  async function handleLogout() {
    await signOutUser();
    await navigate('/login');
  }

  return (
    <div className="flex items-center gap-2.5">
      <Avatar nombre={user.email ?? '?'} size="sm" />
      {/* El correo se oculta en móvil; el avatar y el rol bastan ahí. */}
      <div className="hidden text-right sm:block">
        <div className="max-w-[16rem] truncate text-xs font-semibold">{user.email}</div>
        <Badge tone={isAdmin ? 'success' : 'warning'}>{isAdmin ? 'Admin' : 'Técnico'}</Badge>
      </div>
      <IconButton
        variant="ghost"
        icon={LogOut}
        label="Cerrar sesión"
        onClick={() => void handleLogout()}
      />
    </div>
  );
}
