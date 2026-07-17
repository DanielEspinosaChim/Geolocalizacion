import { Check, Clock, MapPin, PartyPopper } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { Progreso } from '../model/campana';
import { AnilloProgreso } from './AnilloProgreso';

/** Hero de progreso para el técnico: anillo + pendientes/hechos. */
export function ProgresoHero({ progreso, colonia }: { progreso: Progreso; colonia?: string | null }) {
  if (progreso.completa) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-success/40 bg-success/10 p-4">
        <PartyPopper className="h-8 w-8 shrink-0 text-success" aria-hidden="true" />
        <div>
          <div className="font-display text-sm font-extrabold text-success">¡Campaña completada!</div>
          <div className="text-xs2 text-success/80">{progreso.total} negocios visitados · 100%</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <AnilloProgreso pct={progreso.pct} color="hsl(var(--primary))">
        <span className="text-primary">{progreso.pct}%</span>
      </AnilloProgreso>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-3 text-xs">
          <span className="flex items-center gap-1 font-bold text-warning">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {progreso.pendientes} pendientes
          </span>
          <span className="flex items-center gap-1 font-semibold text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> {progreso.hecho} total
          </span>
        </div>
        {colonia ? (
          <div className="mb-1 flex items-center gap-1 text-2xs text-fg-subtle">
            <MapPin className="h-3 w-3" aria-hidden="true" /> {colonia}
          </div>
        ) : null}
        <BarraProgreso pct={progreso.pct} />
      </div>
    </div>
  );
}

/** Barra de avance animada (motion): se llena de 0 → pct al entrar en vista. */
function BarraProgreso({ pct }: { pct: number }) {
  const sinMovimiento = useReducedMotion();
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-bg">
      <motion.div
        className="h-full rounded-full bg-primary-strong"
        initial={{ width: sinMovimiento ? `${pct}%` : '0%' }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
