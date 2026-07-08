import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { AppProviders } from './providers/AppProviders';
import { router } from './router';
import '../styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('No existe el elemento #root');

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
