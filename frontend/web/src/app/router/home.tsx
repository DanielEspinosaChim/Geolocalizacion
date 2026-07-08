// Página temporal de la Fase 0 — se reemplaza por @features/candidatos en la Fase 3.
const FEATURES_PENDIENTES = [
  ['auth', 'Fase 1'],
  ['candidatos', 'Fase 3'],
  ['reportes · rutas · colonias-zonas', 'Fase 4'],
  ['campanas', 'Fase 5'],
  ['predicciones · admin', 'Fase 6'],
] as const;

export function HomePage() {
  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <section className="w-full max-w-md rounded-card border border-border bg-surface p-8 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          GeoFormal · Migración Fase 0
        </p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">Nueva base React lista</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Vite 6 + React 19 + TypeScript estricto con Screaming Architecture. El legacy sigue
          sirviéndose desde <code className="text-fg">frontend/</code> hasta alcanzar paridad.
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {FEATURES_PENDIENTES.map(([nombre, fase]) => (
            <li key={nombre} className="flex items-center justify-between gap-4">
              <span className="text-fg-muted">{nombre}</span>
              <span className="rounded-control border border-border bg-surface-raised px-2 py-0.5 text-xs font-semibold text-fg-subtle">
                {fase}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
