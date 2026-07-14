import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { signOutUser, type SessionUser } from '@core/auth';
import { Avatar, IconButton } from '@shared/ui';

/**
 * Menú de usuario del app bar. Va sobre el fondo indigo del header, así que
 * todo su color es claro (blanco translúcido), no el del tema.
 */
export function UserMenu({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';

  async function handleLogout() {
    await signOutUser();
    await navigate('/login');
  }

  return (
    <div className="flex items-center gap-2.5 text-primary-fg">
      <Avatar nombre={user.email ?? '?'} size="sm" className="bg-white/20 text-white" />
      {/* El correo se oculta en móvil; el avatar y el rol bastan ahí. */}
      <div className="hidden text-right sm:block">
        <div className="max-w-[16rem] truncate text-xs font-semibold">{user.email}</div>
        <span className="inline-block whitespace-nowrap rounded-full border border-white/25 bg-white/15 px-2 py-px text-2xs font-bold">
          {isAdmin ? 'Admin' : 'Técnico'}
        </span>
      </div>
      <IconButton
        variant="ghost"
        icon={LogOut}
        label="Cerrar sesión"
        onClick={() => void handleLogout()}
        className="text-white/80 hover:bg-white/15 hover:text-white"
      />
    </div>
  );
}
