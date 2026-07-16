import { useState } from 'react';
import { VERSION_LABEL } from '@shared/lib/version';
import { Card, LogoCanaco, ThemeToggle } from '@shared/ui';
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

      <div className="relative z-panel w-full max-w-sm">
        <Card as="section" className="anim-scale-in p-9 shadow-overlay">
          <header className="mb-8 grid justify-items-center gap-1.5 text-center">
            {/* Emblema CANACO en currentColor: marino sobre la tarjeta blanca
                en tema claro, blanco sobre la tarjeta oscura (como el header). */}
            <LogoCanaco
              role="img"
              aria-label="CANACO Mérida"
              className="mb-2 h-16 w-auto text-primary dark:text-white"
            />
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
        <DesarrolladoPor />
      </div>
    </main>
  );
}

/**
 * Crédito "Desarrollado por Techmaleon", debajo de la tarjeta de acceso.
 * El logo vive en `frontend/public/logo-techmaleon.png` (fuera del build de
 * Vite); si por algo no carga, se oculta la imagen y queda el texto.
 */
function DesarrolladoPor() {
  const [logoOk, setLogoOk] = useState(true);
  return (
    <div className="mt-5 flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-fg-subtle">
        Desarrollado por{logoOk ? ':' : ' Techmaleon'}
      </span>
      {logoOk ? (
        <img
          src="/logo-techmaleon.png"
          alt="Techmaleon"
          className="h-7 w-auto"
          onError={() => setLogoOk(false)}
        />
      ) : null}
    </div>
  );
}
