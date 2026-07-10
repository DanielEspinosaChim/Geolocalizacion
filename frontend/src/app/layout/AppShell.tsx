import { MapPinned } from 'lucide-react';
import { Outlet } from 'react-router';
import { useCierrePorInactividad, useSession } from '@features/auth';
import { NavTabs } from './NavTabs';
import { UserMenu } from './UserMenu';

/** Layout protegido: header + tabs + contenido. El loader requireAuth ya corrió. */
export function AppShell() {
  const { user } = useSession();
  useCierrePorInactividad(Boolean(user));

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary/15 text-primary">
            <MapPinned className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-base font-extrabold tracking-tight">GeoFormal</h1>
            {/* Se oculta en móvil: el espacio lo necesita el menú de usuario. */}
            <p className="hidden text-2xs text-fg-subtle sm:block">
              Mérida, Yucatán · Google Maps vs DENUE
            </p>
          </div>
        </div>
        {user ? <UserMenu user={user} /> : null}
      </header>
      {user ? (
        <div className="shrink-0 border-b border-border bg-surface">
          <NavTabs role={user.role} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
