import { Toaster as SonnerToaster } from 'sonner';

/** Toasts de la app (montado una vez en AppProviders). Usa los design tokens. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: 'rounded-card border border-border bg-surface text-fg shadow-2xl',
      }}
    />
  );
}

export { toast } from 'sonner';
