import { Component, type ErrorInfo, type PropsWithChildren } from 'react';

interface State {
  error: Error | null;
}

/**
 * Frontera de errores de último recurso: evita la pantalla en blanco si un
 * render lanza fuera del árbol de rutas (el router ya tiene su errorElement).
 */
export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // TODO(observabilidad): enviar a Sentry/GCP cuando se configure.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-full items-center justify-center bg-bg p-6 text-fg">
        <section className="w-full max-w-md rounded-card border border-danger/30 bg-surface p-8 text-center">
          <h1 className="font-display text-xl font-extrabold text-danger">La aplicación falló</h1>
          <p className="mt-3 text-sm text-fg-muted">
            Ocurrió un error inesperado. Recarga la página; si persiste, contacta al administrador.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-control bg-primary-strong px-4 py-2 text-sm font-bold text-primary-fg"
          >
            Recargar
          </button>
        </section>
      </main>
    );
  }
}
