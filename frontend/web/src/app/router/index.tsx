import { createBrowserRouter } from 'react-router';
import { HomePage } from './home';

// TODO(Fase 1): AppShell con <Outlet/>, loader requireAuth global,
// requireRole('admin') en /admin y rutas lazy por feature:
//   { index: true, lazy: () => import('@features/candidatos') }, …
export const router = createBrowserRouter([{ path: '/', element: <HomePage /> }]);
