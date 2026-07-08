import type { Progreso } from '../model/campana';

/** Hero de progreso para el técnico: anillo + pendientes/hechos. */
export function ProgresoHero({ progreso, colonia }: { progreso: Progreso; colonia?: string | null }) {
  if (progreso.completa) {
    return (
      <div className="flex items-center gap-3 rounded-card border border-success/40 bg-success/10 p-4">
        <span className="text-3xl">🎉</span>
        <div>
          <div className="font-display text-sm font-extrabold text-success">¡Campaña completada!</div>
          <div className="text-[11px] text-success/80">{progreso.total} negocios visitados · 100%</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(hsl(var(--primary)) ${progreso.pct * 3.6}deg, hsl(var(--bg)) 0deg)` }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-xs font-extrabold text-primary">
          {progreso.pct}%
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap gap-3 text-xs">
          <span className="font-bold text-warning">⏳ {progreso.pendientes} pendientes</span>
          <span className="font-semibold text-success">✓ {progreso.hecho} total</span>
        </div>
        {colonia ? <div className="mb-1 text-[10px] text-fg-subtle">🏘️ {colonia}</div> : null}
        <div className="h-1.5 overflow-hidden rounded-full bg-bg">
          <div className="h-full rounded-full bg-primary-strong transition-all" style={{ width: `${progreso.pct}%` }} />
        </div>
      </div>
    </div>
  );
}
