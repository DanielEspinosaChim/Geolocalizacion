import { createBrowserRouter } from 'react-router';
import { LoginPage } from '@features/auth';
import { AppShell } from '../layout/AppShell';
import { indexLoader, redirectIfAuthed, requireAuth, requireRole } from './guards';
import { PlaceholderPage } from './PlaceholderPage';
import { RouteError } from './RouteError';

/* Placeholders: cada uno se reemplaza por `lazy: () => import('@features/<x>')`
   en su fase del plan de migración. */
const placeholder = (title: string, fase: string, descripcion: string) => (
  <PlaceholderPage title={title} fase={fase} descripcion={descripcion} />
);

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
        element: placeholder('Mapa de candidatos', 'Fase 3', 'El mapa con clusters y filtros se migra en la Fase 3.'),
      },
      {
        path: 'predicciones',
        element: placeholder('Predicción', 'Fase 6', 'Zonas de predicción y calculadora de índice llegan en la Fase 6.'),
      },
      {
        path: 'rutas',
        element: placeholder('Ruta', 'Fase 4', 'La optimización de recorridos se migra en la Fase 4.'),
      },
      {
        path: 'reportes',
        element: placeholder('Reportes', 'Fase 4', 'Reportes de visita con GPS y foto llegan en la Fase 4.'),
      },
      {
        path: 'campanas',
        element: placeholder('Campañas', 'Fase 5', 'Campañas, plantillas y checklist de visita se migran en la Fase 5.'),
      },
      {
        path: 'validacion',
        element: placeholder('Validación', 'Fase 6', 'La muestra de validación del modelo llega en la Fase 6.'),
      },
      {
        path: 'admin',
        loader: requireRole('admin'), // ◀── solo admin (el backend re-valida igual)
        element: placeholder('Administración', 'Fase 6', 'Gestión de usuarios y asignación de campañas llega en la Fase 6.'),
      },
    ],
  },
]);
