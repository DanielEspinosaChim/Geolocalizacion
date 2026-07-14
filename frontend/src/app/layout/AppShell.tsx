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
      {/* App bar indigo: rompe el exceso de blanco y refuerza la marca. Texto e
          iconos en claro; el menú de usuario está pensado para este fondo. */}
      <header className="z-panel flex h-14 shrink-0 items-center justify-between gap-4 bg-gradient-to-r from-primary-strong to-primary px-4 text-primary-fg shadow-card sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-white/15 text-white">
            <MapPinned className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-base font-extrabold tracking-tight">GeoFormal</h1>
            {/* Se oculta en móvil: el espacio lo necesita el menú de usuario. */}
            <p className="hidden text-2xs text-white/70 sm:block">
              Mérida, Yucatán · Google Maps vs DENUE
            </p>
          </div>
        </div>
        {user ? <UserMenu user={user} /> : null}
      </header>
      {user ? (
        /* La sombra (no un borde) separa la barra del contenido: es la única
           elevación del shell, como la cabecera blanca de Google Maps. */
        <div className="z-panel shrink-0 bg-surface shadow-card">
          <NavTabs role={user.role} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
