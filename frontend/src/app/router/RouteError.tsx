import { Link, useRouteError } from 'react-router';

export function RouteError() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'Error inesperado';

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <section className="w-full max-w-md rounded-card border border-danger/30 bg-surface p-8 text-center">
        <h1 className="font-display text-xl font-extrabold text-danger">Algo salió mal</h1>
        <p className="mt-3 break-words text-sm text-fg-muted">{message}</p>
        <Link to="/" className="mt-5 inline-block text-sm font-semibold text-primary underline">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
