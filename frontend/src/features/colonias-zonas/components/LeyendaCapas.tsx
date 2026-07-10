import type { ReactNode } from 'react';
import { NIVELES_PROBABILIDAD } from '../model/zona';
import type { CapaId } from './CapasToggles';

interface LeyendaCapasProps {
  activas: ReadonlySet<CapaId>;
  /** Filas propias de la vista (p. ej. los colores de formalización del mapa). */
  children?: ReactNode;
}

/**
 * Leyenda flotante del mapa. Explica la escala de la capa de probabilidad y, si
 * la vista aporta símbolos propios, los antepone.
 *
 * Se oculta entera cuando no hay nada que explicar: una leyenda de marcadores
 * que no existen confunde más de lo que ayuda.
 */
export function LeyendaCapas({ activas, children }: LeyendaCapasProps) {
  const probabilidad = activas.has('probabilidad');
  if (!probabilidad && !children) return null;

  return (
    <div className="absolute bottom-4 left-4 z-panel grid gap-1.5 rounded-card border border-border bg-surface/90 p-3 text-xs2 backdrop-blur">
      {children}
      {probabilidad ? (
        <>
          <span className="font-bold uppercase tracking-wider text-fg-subtle">Probabilidad</span>
          {NIVELES_PROBABILIDAD.map((n) => (
            <span key={n.nivel} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: n.color }}
              />
              {n.nivel} <span className="text-fg-subtle">{n.rango}</span>
            </span>
          ))}
        </>
      ) : null}
    </div>
  );
}
