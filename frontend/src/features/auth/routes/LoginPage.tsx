import { Map } from 'lucide-react';
import { VERSION_LABEL } from '@shared/lib/version';
import { Card, ThemeToggle } from '@shared/ui';
import { LoginForm } from '../components/LoginForm';

/**
 * Pantalla de acceso. El fondo es decorativo puro (aria-hidden): gradiente de
 * marca en movimiento + manchas difuminadas flotando detrás de la tarjeta.
 * Todo el color sale de los tokens, así que el modo oscuro lo redefine solo.
 */
export function LoginPage() {
  return (
    <main className="relative flex min-h-full items-center justify-center overflow-hidden bg-bg p-6">
      {/* ── Fondo decorativo ── */}
      <div aria-hidden="true" className="absolute inset-0">
        {/* Lavado de marca: esquina superior izquierda → transparente. */}
        <div className="anim-gradient absolute inset-0 bg-[linear-gradient(130deg,hsl(var(--primary)/0.16),transparent_45%,hsl(var(--primary)/0.08)_70%,hsl(var(--success)/0.1))]" />
        {/* Manchas flotantes difuminadas (estilo aurora). */}
        <div className="anim-float absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="anim-float-slow absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-strong/20 blur-3xl" />
        <div className="anim-float absolute left-1/2 top-2/3 h-64 w-64 rounded-full bg-success/15 blur-3xl [animation-delay:-4s]" />
        {/* Retícula de puntos sutil, como un plano de mapa. */}
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--fg)/0.05)_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>

      <ThemeToggle className="absolute right-4 top-4 z-panel" />

      <Card as="section" className="anim-scale-in relative z-panel w-full max-w-sm p-9 shadow-overlay">
        <header className="mb-8 grid justify-items-center gap-1.5 text-center">
          <div className="mb-2 flex h-13 w-13 items-center justify-center rounded-card bg-gradient-to-br from-primary-strong to-primary p-3 shadow-lg shadow-primary/40">
            <Map className="h-7 w-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">GeoFormal</h1>
          <p className="text-xs font-medium text-fg-subtle">
            Sistema de Geolocalización · Mérida, Yucatán
          </p>
        </header>
        <LoginForm />
        <p className="mt-6 text-center text-xs2 font-medium text-fg-subtle/70">
          Municipio de Mérida, Yucatán · Uso interno · {VERSION_LABEL}
        </p>
      </Card>
    </main>
  );
}
