import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  return (
    <main className="flex min-h-full items-center justify-center bg-[radial-gradient(ellipse_at_30%_40%,hsl(var(--surface))_0%,hsl(var(--bg))_60%)] p-6">
      <section className="w-full max-w-sm rounded-card border border-border bg-surface p-9 shadow-2xl">
        <header className="mb-8 grid justify-items-center gap-1.5 text-center">
          <div className="mb-2 flex h-13 w-13 items-center justify-center rounded-card bg-gradient-to-br from-primary-strong to-primary p-3 text-2xl shadow-lg shadow-primary/40">
            🗺️
          </div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">GeoFormal</h1>
          <p className="text-xs font-medium text-fg-subtle">
            Sistema de Geolocalización · Mérida, Yucatán
          </p>
        </header>
        <LoginForm />
        <p className="mt-6 text-center text-[11px] font-medium text-fg-subtle/70">
          Municipio de Mérida, Yucatán · Uso interno
        </p>
      </section>
    </main>
  );
}
