import Lenis from 'lenis';
import { useReducedMotion } from 'motion/react';
import { useEffect, useRef, type PropsWithChildren } from 'react';

/**
 * Contenedor de scroll del índice con desplazamiento animado (Lenis): la
 * rueda del mouse pasa por la animación de Lenis y las teclas (flechas,
 * AvPág/RePág, Inicio/Fin, espacio) se reconducen a `lenis.scrollTo`, así el
 * recorrido por los pasos se siente igual de fluido con cualquier entrada y
 * los `Reveal` entran siempre en movimiento, nunca de golpe.
 *
 * Sustituye a `Page` solo en esta vista (replica su ancho `wide` y padding).
 * Con `prefers-reduced-motion` queda como scroll nativo normal.
 */
export function ScrollSuave({ children }: PropsWithChildren) {
  const ref = useRef<HTMLDivElement>(null);
  const sinMovimiento = useReducedMotion();

  useEffect(() => {
    const wrapper = ref.current;
    if (!wrapper || sinMovimiento) return;

    const lenis = new Lenis({
      wrapper,
      content: wrapper.firstElementChild as HTMLElement,
      duration: 1.05,
      autoRaf: true,
    });

    // Objetivo acumulado propio: pulsaciones seguidas (o mantener la flecha)
    // deben SUMAR pasos, y `lenis.targetScroll` aún no refleja el scrollTo
    // anterior cuando llega la siguiente tecla. Se resincroniza tras una
    // pausa para no quedar desfasado si el usuario mezcla rueda y teclado.
    let objetivo: number | null = null;
    let timerObjetivo: number | undefined;

    function onKeyDown(e: KeyboardEvent) {
      // No secuestrar teclas de controles interactivos (botones, inputs…).
      if (e.target !== wrapper) return;
      const pagina = wrapper!.clientHeight * 0.85;
      const deltas: Record<string, number> = {
        ArrowDown: 140,
        ArrowUp: -140,
        PageDown: pagina,
        PageUp: -pagina,
        ' ': e.shiftKey ? -pagina : pagina,
      };
      let destino: number;
      if (e.key === 'Home') destino = 0;
      else if (e.key === 'End') destino = wrapper!.scrollHeight;
      else if (e.key in deltas) destino = (objetivo ?? lenis.scroll) + deltas[e.key];
      else return;
      e.preventDefault();
      const max = wrapper!.scrollHeight - wrapper!.clientHeight;
      objetivo = Math.max(0, Math.min(destino, max));
      lenis.scrollTo(objetivo);
      window.clearTimeout(timerObjetivo);
      timerObjetivo = window.setTimeout(() => (objetivo = null), 400);
    }

    // El wrapper toma el foco al montar y al clickear zonas no interactivas,
    // para que las flechas funcionen sin tener que tabular hasta él.
    function onPointerDown(e: PointerEvent) {
      const el = e.target as HTMLElement;
      if (el.closest('a,button,input,select,textarea,[tabindex]')) return;
      wrapper!.focus({ preventScroll: true });
    }

    wrapper.focus({ preventScroll: true });
    wrapper.addEventListener('keydown', onKeyDown);
    wrapper.addEventListener('pointerdown', onPointerDown);
    return () => {
      wrapper.removeEventListener('keydown', onKeyDown);
      wrapper.removeEventListener('pointerdown', onPointerDown);
      lenis.destroy();
    };
  }, [sinMovimiento]);

  return (
    <div
      ref={ref}
      tabIndex={0}
      className="scrollbar-slim h-full overflow-y-auto outline-none"
    >
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
