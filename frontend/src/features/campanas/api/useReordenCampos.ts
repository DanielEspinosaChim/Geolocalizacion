import { useState } from 'react';
import { nuevaKeyCampo, type Campo } from '../model/plantilla';

/** Saca el elemento de `from` y lo inserta en `to` (reordenamiento). */
function reubicar<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= arr.length) return arr;
  const copia = [...arr];
  const [movido] = copia.splice(from, 1);
  if (movido === undefined) return arr;
  copia.splice(to, 0, movido);
  return copia;
}

/**
 * Estado y acciones de la lista editable de campos: alta/baja/edición y reorden
 * por flechas o arrastre (SortableJS). `movidoKey` marca el campo recién movido
 * por flechas para animarlo (el arrastre lo anima SortableJS).
 */
export function useReordenCampos(inicial: Campo[]) {
  const [campos, setCampos] = useState<Campo[]>(inicial);
  const [movidoKey, setMovidoKey] = useState<string | null>(null);

  /** El null + rAF reinicia la animación aunque se mueva el mismo campo. */
  function marcarMovido(key: string | undefined) {
    if (!key) return;
    setMovidoKey(null);
    requestAnimationFrame(() => setMovidoKey(key));
  }

  return {
    campos,
    movidoKey,
    actualizar: (i: number, patch: Partial<Campo>) =>
      setCampos((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c))),
    agregar: () =>
      setCampos((prev) => [...prev, { key: nuevaKeyCampo(), label: '', tipo: 'texto' }]),
    quitar: (i: number) => setCampos((prev) => prev.filter((_, j) => j !== i)),
    /** Flechas ↑↓: reordena y dispara el pulso de realce. */
    mover: (i: number, dir: -1 | 1) => {
      marcarMovido(campos[i]?.key);
      setCampos((prev) => reubicar(prev, i, i + dir));
    },
    /** Arrastre (SortableJS onEnd): solo reordena; la animación la da la librería. */
    reordenar: (from: number, to: number) => setCampos((prev) => reubicar(prev, from, to)),
  };
}
