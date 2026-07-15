import { MapPinned } from 'lucide-react';
import { Outlet } from 'react-router';
import { ThemeToggle } from '@shared/ui';
import { useCierrePorInactividad, useSession } from '@features/auth';
import { NavTabs } from './NavTabs';
import { UserMenu } from './UserMenu';

/** Layout protegido: una sola barra (logo + pestañas + usuario) + contenido. */
export function AppShell() {
  const { user } = useSession();
  useCierrePorInactividad(Boolean(user));

  return (
    <div className="flex h-full flex-col">
      {/* Barra única indigo: logo + título a la izquierda, las secciones en el
          centro y el tema + usuario a la derecha. Sin subtítulo ni versión: el
          espacio libre lo aprovechan las pestañas. */}
      <header className="relative z-overlay flex h-14 shrink-0 items-center gap-2 bg-gradient-to-r from-primary-strong to-primary px-3 text-primary-fg shadow-card sm:gap-4 sm:px-5">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-white/15 text-white">
            <MapPinned className="h-5 w-5" aria-hidden="true" />
          </span>
          {/* El título se oculta en móvil: ahí el espacio lo necesitan las pestañas. */}
          <h1 className="hidden font-display text-lg font-extrabold tracking-tight sm:block">
            GeoFormal
          </h1>
        </div>

        {user ? <NavTabs role={user.role} variant="brand" /> : <div className="flex-1" />}

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle className="text-white/80 hover:bg-white/15 hover:text-white" />
          {user ? <UserMenu user={user} /> : null}
        </div>
      </header>
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
