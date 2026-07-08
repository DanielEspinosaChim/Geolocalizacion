import { Outlet } from 'react-router';
import { useSession } from '@features/auth';
import { NavTabs } from './NavTabs';
import { UserMenu } from './UserMenu';

/** Layout protegido: header + tabs + contenido. El loader requireAuth ya corrió. */
export function AppShell() {
  const { user } = useSession();

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-13 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-5 py-2">
        <div>
          <h1 className="font-display text-base font-extrabold tracking-tight">GeoFormal</h1>
          <p className="text-[10px] text-fg-subtle">Mérida, Yucatán · Google Maps vs DENUE</p>
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
