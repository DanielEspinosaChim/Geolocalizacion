import { NIVELES_PROBABILIDAD } from '@features/colonias-zonas';
import { TIPO_COLORS, TIPO_LABELS, TIPOS } from '../model/candidato';

interface SimbologiaProps {
  /** Añade la escala de la capa de probabilidad cuando está activa. */
  mostrarProbabilidad: boolean;
}

/** Leyenda del mapa: colores de los marcadores (+ escala de probabilidad). */
export function Simbologia({ mostrarProbabilidad }: SimbologiaProps) {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] grid gap-1.5 rounded-card border border-border bg-surface/90 p-3 text-xs2 backdrop-blur">
      <span className="font-bold uppercase tracking-wider text-fg-subtle">Simbología</span>
      {TIPOS.map((t) => (
        <span key={t} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIPO_COLORS[t] }} aria-hidden="true" />
          {TIPO_LABELS[t]}
        </span>
      ))}
      {mostrarProbabilidad ? (
        <>
          <span className="mt-1 font-bold uppercase tracking-wider text-fg-subtle">Probabilidad</span>
          {NIVELES_PROBABILIDAD.map((n) => (
            <span key={n.nivel} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: n.color }} aria-hidden="true" />
              {n.nivel} <span className="text-fg-subtle">{n.rango}</span>
            </span>
          ))}
        </>
      ) : null}
    </div>
  );
}
