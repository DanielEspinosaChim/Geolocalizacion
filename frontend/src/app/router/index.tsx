import { createBrowserRouter } from 'react-router';
import { LoginPage } from '@features/auth';
import { AppShell } from '../layout/AppShell';
import { indexLoader, redirectIfAuthed, requireAuth, requireRole } from './guards';
import { RouteError } from './RouteError';

export const router = createBrowserRouter([
  {
    path: '/login',
    loader: redirectIfAuthed,
    element: <LoginPage />,
    errorElement: <RouteError />,
  },
  {
    element: <AppShell />,
    loader: requireAuth, // ◀── guardia global: sin sesión, no entra
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        loader: indexLoader,
        lazy: async () => ({
          Component: (await import('@features/candidatos')).CandidatosPage,
        }),
      },
      {
        path: 'predicciones',
        loader: requireRole('admin'),
        lazy: async () => ({ Component: (await import('@features/predicciones')).PrediccionesPage }),
      },
      {
        path: 'rutas',
        lazy: async () => ({ Component: (await import('@features/rutas')).RutasPage }),
      },
      {
        path: 'reportes',
        lazy: async () => ({ Component: (await import('@features/reportes')).ReportesPage }),
      },
      {
        path: 'reportes/historial',
        lazy: async () => ({
          Component: (await import('@features/reportes')).HistorialReportesPage,
        }),
      },
      {
        path: 'campanas',
        lazy: async () => ({ Component: (await import('@features/campanas')).CampanasPage }),
      },
      {
        path: 'validacion',
        loader: requireRole('admin'),
        lazy: async () => ({ Component: (await import('@features/predicciones')).ValidacionPage }),
      },
      {
        path: 'indice',
        loader: requireRole('admin'),
        lazy: async () => ({ Component: (await import('@features/indice')).IndicePage }),
      },
      {
        path: 'canasta',
        loader: requireRole('admin'),
        lazy: async () => ({ Component: (await import('@features/canasta')).CanastaPage }),
      },
      {
        path: 'admin',
        loader: requireRole('admin'), // ◀── solo admin (el backend re-valida igual)
        lazy: async () => ({ Component: (await import('@features/admin')).AdminPage }),
      },
    ],
  },
]);
