import { LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { signOutUser, type SessionUser } from '@core/auth';
import { Avatar } from '@shared/ui';

/**
 * Menú de usuario del app bar: en reposo solo se ve el avatar; al pulsarlo se
 * abre un desplegable con el correo, el rol y "Cerrar sesión". Se cierra al
 * hacer clic fuera o con Escape.
 */
export function UserMenu({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = user.role === 'admin';

  // Cierra al hacer clic fuera del menú o al pulsar Escape.
  useEffect(() => {
    if (!abierto) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [abierto]);

  async function handleLogout() {
    await signOutUser();
    await navigate('/login');
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Menú de usuario"
        onClick={() => setAbierto((v) => !v)}
        className="rounded-full ring-white/40 transition hover:ring-2"
      >
        <Avatar nombre={user.email ?? '?'} size="sm" className="bg-white/20 text-white" />
      </button>

      {abierto ? (
        <div
          role="menu"
          className="anim-fade-up absolute right-0 top-full z-toast mt-2 w-64 overflow-hidden rounded-card border border-border bg-surface text-fg shadow-overlay"
        >
          <div className="flex items-center gap-3 border-b border-border p-4">
            <Avatar nombre={user.email ?? '?'} size="sm" />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{user.email}</div>
              <span className="text-2xs font-bold uppercase tracking-wider text-fg-subtle">
                {isAdmin ? 'Administrador' : 'Técnico'}
              </span>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-raised hover:text-danger"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
