import { useNavigate } from 'react-router';
import { signOutUser, type SessionUser } from '@core/auth';
import { Button } from '@shared/ui';

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
        <span
          className={`inline-block rounded-full border px-2 py-px text-[10px] font-bold ${
            isAdmin
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-warning/30 bg-warning/10 text-warning'
          }`}
        >
          {isAdmin ? 'Admin' : 'Técnico'}
        </span>
      </div>
      <Button variant="secondary" onClick={() => void handleLogout()} className="px-3 py-1.5 text-xs">
        Salir
      </Button>
    </div>
  );
}
