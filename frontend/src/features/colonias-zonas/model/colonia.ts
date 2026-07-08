import { z } from 'zod';

export const coloniaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  count: z.number().catch(0),
});
export const coloniaListSchema = z.array(coloniaSchema);
export type Colonia = z.infer<typeof coloniaSchema>;

/** Paleta cíclica para polígonos de colonias (paridad con el legacy). */
export const COLONIA_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#6366f1', '#84cc16', '#ef4444',
  '#14b8a6', '#a855f7', '#0ea5e9', '#f43f5e',
];

const PREFIJOS = /^(COL\.|COLONIA|FRACC\.|FRACCIONAMIENTO|BARRIO)\s+/i;

/** Empareja el nombre de un polígono con el catálogo de colonias (fuzzy, como el legacy). */
export function buscarColoniaMatch(nombreUpper: string, colonias: Colonia[]): Colonia | null {
  const exacta = colonias.find((c) => c.id === nombreUpper);
  if (exacta) return exacta;
  const limpio = nombreUpper.replace(PREFIJOS, '').trim();
  return (
    colonias.find((c) => {
      const cLimpio = c.id.replace(PREFIJOS, '').trim();
      return cLimpio === limpio || c.id.includes(limpio) || limpio.includes(c.id);
    }) ?? null
  );
}
