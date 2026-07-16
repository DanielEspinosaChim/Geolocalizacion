import { motion, useReducedMotion } from 'motion/react';
import type { PropsWithChildren } from 'react';

/**
 * Sección que entra en escena al llegar al viewport (desvanecido + subida
 * sutil, una sola vez): convierte el scroll de la metodología en una
 * narrativa por pasos en vez de un documento plano. Con
 * `prefers-reduced-motion` no anima — devuelve los hijos tal cual.
 */
export function Reveal({ children }: PropsWithChildren) {
  const sinMovimiento = useReducedMotion();
  if (sinMovimiento) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      // Mismo cubic-bezier que --ease-out (tokens.css).
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
