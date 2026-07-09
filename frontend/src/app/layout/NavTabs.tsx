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
  { to: '/admin', label: 'Admin', roles: ['admin'] },
];

export function NavTabs({ role }: { role: Role }) {
  return (
    <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-3">
      {NAV_ITEMS.filter((item) => item.roles.includes(role)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'border-primary text-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
