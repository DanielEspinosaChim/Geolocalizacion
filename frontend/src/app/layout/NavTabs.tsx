import { Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import type { Role } from '@core/auth';

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

/* Paridad con el legacy: técnico solo ve Ruta, Reportes y Campañas. */
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Mapa', roles: ['admin'] },
  { to: '/predicciones', label: 'Predicción', roles: ['admin'] },
  { to: '/rutas', label: 'Ruta', roles: ['admin', 'tecnico'] },
  { to: '/reportes', label: 'Reportes', roles: ['admin', 'tecnico'] },
  { to: '/campanas', label: 'Campañas', roles: ['admin', 'tecnico'] },
  { to: '/validacion', label: 'Validación', roles: ['admin'] },
  { to: '/indice', label: 'Índice', roles: ['admin'] },
  { to: '/canasta', label: 'Canasta', roles: ['admin'] },
  { to: '/admin', label: 'Admin', roles: ['admin'] },
];

/** Estilo de las pills según viva sobre superficie clara o sobre la marca (header). */
const VARIANTES = {
  surface: {
    activa: 'bg-primary text-primary-fg shadow-sm shadow-primary/30',
    inactiva: 'text-fg-muted hover:bg-surface-raised hover:text-fg',
    boton: 'text-fg-muted hover:bg-surface-raised hover:text-fg',
  },
  brand: {
    activa: 'bg-white/20 text-white',
    inactiva: 'text-white/70 hover:bg-white/10 hover:text-white',
    boton: 'text-white/80 hover:bg-white/15 hover:text-white',
  },
} as const;

interface NavTabsProps {
  role: Role;
  variant?: keyof typeof VARIANTES;
}

export function NavTabs({ role, variant = 'surface' }: NavTabsProps) {
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const v = VARIANTES[variant];
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  // Centra la pestaña activa en la fila de escritorio si no caben todas.
  useEffect(() => {
    const nav = navRef.current;
    const activo = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !activo) return;
    nav.scrollTo({
      left: activo.offsetLeft - nav.clientWidth / 2 + activo.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [pathname]);

  return (
    <div className="flex min-w-0 flex-1 items-center">
      {/* Escritorio: pills centradas (mx-auto). */}
      <nav
        ref={navRef}
        aria-label="Secciones"
        className="scrollbar-none mx-auto hidden max-w-full gap-2 overflow-x-auto scroll-smooth px-2 md:flex"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-control px-4 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? v.activa : v.inactiva
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Móvil: botón hamburguesa con menú desplegable. */}
      <MenuMovil items={items} claseBoton={v.boton} />
    </div>
  );
}

/** Menú de secciones para móvil: hamburguesa + desplegable vertical. */
function MenuMovil({ items, claseBoton }: { items: NavItem[]; claseBoton: string }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  // Cierra al navegar o al hacer clic fuera.
  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [abierto]);

  return (
    <div className="relative md:hidden" ref={ref}>
      <button
        type="button"
        aria-label="Secciones"
        aria-expanded={abierto}
        onClick={() => setAbierto((x) => !x)}
        className={`rounded-control p-2 transition-colors ${claseBoton}`}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {abierto ? (
        <nav
          aria-label="Secciones"
          className="anim-fade-up absolute left-0 top-full z-toast mt-2 w-52 overflow-hidden rounded-card border border-border bg-surface py-1 text-fg shadow-overlay"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary-strong'
                    : 'text-fg-muted hover:bg-surface-raised hover:text-fg'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
