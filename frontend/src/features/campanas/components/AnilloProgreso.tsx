import { motion, useReducedMotion } from 'motion/react';

/** Geometría del anillo: radio y perímetro para el dasharray del SVG. */
const R = 24;
const PERIMETRO = 2 * Math.PI * R;

interface AnilloProgresoProps {
  pct: number;
  /** Color del arco (CSS). El riel siempre es el borde atenuado del tema. */
  color: string;
  /** Contenido del centro (típicamente el % en texto). */
  children: React.ReactNode;
}

/**
 * Anillo de progreso animado (motion): el arco se dibuja de 0 → pct al entrar
 * al viewport, una sola vez. Sustituye al `conic-gradient` estático que tenían
 * la tarjeta de campaña y el hero del técnico. Decorativo (aria-hidden): el
 * dato accesible viaja en el texto que lo acompaña.
 */
export function AnilloProgreso({ pct, color, children }: AnilloProgresoProps) {
  const sinMovimiento = useReducedMotion();
  const destino = PERIMETRO * (1 - Math.min(100, Math.max(0, pct)) / 100);

  return (
    <span aria-hidden="true" className="relative grid h-14 w-14 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={R}
          fill="none"
          stroke="hsl(var(--border) / 0.5)"
          strokeWidth="6"
        />
        <motion.circle
          cx="28"
          cy="28"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={PERIMETRO}
          initial={{ strokeDashoffset: sinMovimiento ? destino : PERIMETRO }}
          whileInView={{ strokeDashoffset: destino }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-xs font-extrabold tabular-nums">
        {children}
      </span>
    </span>
  );
}
