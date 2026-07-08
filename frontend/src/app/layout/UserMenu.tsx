import { useNavigate } from 'react-router';
import { signOutUser, type SessionUser } from '@core/auth';
import { Badge, Button } from '@shared/ui';

export function UserMenu({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';

  async function handleLogout() {
    await signOutUser();
    await navigate('/login');
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-xs font-semibold">{user.email}</div>
        <Badge tone={isAdmin ? 'success' : 'warning'}>{isAdmin ? 'Admin' : 'Técnico'}</Badge>
      </div>
      <Button variant="secondary" onClick={() => void handleLogout()} className="px-3 py-1.5 text-xs">
        Salir
      </Button>
    </div>
  );
}
