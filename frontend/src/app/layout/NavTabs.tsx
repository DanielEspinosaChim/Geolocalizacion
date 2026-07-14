import { NavLink } from 'react-router';
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

export function NavTabs({ role }: { role: Role }) {
  return (
    /* Pills tipo chip (el patrón de la fila de categorías de Google Maps):
       la sección activa se marca con relleno indigo suave, no con subrayado. */
    <nav aria-label="Secciones" className="scrollbar-none flex gap-1.5 overflow-x-auto px-3 py-2">
      {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
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
  );
}
