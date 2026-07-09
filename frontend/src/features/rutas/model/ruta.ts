import { z } from 'zod';

export const MAX_PUNTOS_RUTA = 20;

export const rutaSchema = z.object({
  geometry: z.unknown(), // GeoJSON de la línea (lo pinta Leaflet tal cual)
  waypoints_ordenados: z.array(
    z.object({
      place_id: z.string().nullish(),
      nombre: z.string().catch('(sin nombre)'),
      lat: z.number(),
      lng: z.number(),
      tipos: z.string().nullish(),
    }),
  ),
  distancia_km: z.number().catch(0),
  tiempo_min: z.number().catch(0),
});
export type RutaCalculada = z.infer<typeof rutaSchema>;

/** Toggle de selección con tope de MAX_PUNTOS_RUTA. Devuelve el mismo Set si no cabe. */
export function togglePunto(seleccion: ReadonlySet<string>, placeId: string): Set<string> {
  const nueva = new Set(seleccion);
  if (nueva.has(placeId)) {
    nueva.delete(placeId);
    return nueva;
  }
  if (nueva.size >= MAX_PUNTOS_RUTA) return nueva;
  nueva.add(placeId);
  return nueva;
}
