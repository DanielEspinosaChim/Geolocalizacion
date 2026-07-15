import { useState } from 'react';
import { toast } from '@shared/ui';
import { MAX_PUNTOS_RUTA, MIN_PARADAS_RUTA as MIN_PARADAS, togglePunto } from '../model/ruta';
import type { useCalcularRuta } from './useRuta';

type Calcular = ReturnType<typeof useCalcularRuta>;

/** Selección de paradas a mano: alta/baja con tope y cálculo de la mejor ruta. */
export function useSeleccionRuta(inicial: string[] | undefined, calcular: Calcular) {
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(() => new Set(inicial ?? []));

  function toggle(placeId: string) {
    const nueva = togglePunto(seleccion, placeId);
    if (nueva.size === seleccion.size && !seleccion.has(placeId)) {
      toast.error(`Máximo ${MAX_PUNTOS_RUTA} puntos por ruta`);
      return;
    }
    setSeleccion(nueva);
  }

  function calcularManual() {
    if (seleccion.size < MIN_PARADAS) {
      toast.error(`Selecciona al menos ${MIN_PARADAS} puntos.`);
      return;
    }
    calcular.mutate([...seleccion]);
  }

  return { seleccion, toggle, calcularManual, limpiar: () => setSeleccion(new Set()) };
}
