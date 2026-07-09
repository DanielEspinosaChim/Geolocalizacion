import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

export interface Ancla {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  /** true = el panel se abrió hacia arriba por falta de sitio abajo. */
  arriba: boolean;
}

const MARGEN = 8;
const ALTURA_MAX = 320;
const ALTURA_MIN = 160;

function sonIguales(a: Ancla, b: Ancla): boolean {
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.maxHeight === b.maxHeight &&
    a.arriba === b.arriba
  );
}

/**
 * Posición fija de un panel flotante anclado a un disparador.
 *
 * Va en `position: fixed` dentro de un portal porque los paneles laterales de la
 * app tienen `overflow-y-auto`: un desplegable posicionado en flujo quedaría
 * recortado por ese contenedor.
 *
 * Se abre hacia abajo salvo que no quepa y arriba haya más sitio; entonces
 * invierte. Nada de "a veces arriba, a veces abajo" sin criterio: siempre gana
 * el lado con más espacio libre.
 */
export function useAnclaFlotante(ref: RefObject<HTMLElement | null>, abierto: boolean): Ancla | null {
  const [ancla, setAncla] = useState<Ancla | null>(null);

  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const debajo = window.innerHeight - r.bottom - MARGEN;
    const encima = r.top - MARGEN;
    // Solo invierte si abajo no cabe lo mínimo y arriba hay más hueco.
    const arriba = debajo < ALTURA_MIN && encima > debajo;
    const disponible = arriba ? encima : debajo;

    const siguiente: Ancla = {
      top: arriba ? r.top - MARGEN : r.bottom + MARGEN,
      left: r.left,
      width: r.width,
      maxHeight: Math.max(ALTURA_MIN, Math.min(ALTURA_MAX, disponible)),
      arriba,
    };

    // Sin este corte, cada medición crearía un objeto nuevo y provocaría un
    // render; si además `medir` cambiara de identidad (un `ref` no estable),
    // el efecto se re-dispararía en bucle.
    setAncla((prev) => (prev && sonIguales(prev, siguiente) ? prev : siguiente));
  }, [ref]);

  useLayoutEffect(() => {
    if (!abierto) {
      setAncla(null);
      return;
    }
    medir();
    // `capture` para enterarse también del scroll de los paneles laterales, que
    // no burbujea hasta window.
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [abierto, medir]);

  return ancla;
}
