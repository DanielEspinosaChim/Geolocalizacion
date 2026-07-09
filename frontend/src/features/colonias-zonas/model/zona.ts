import { z } from 'zod';

/** Zona de predicción ML: celda de 500m con score de probabilidad de informalidad. */
export const zonaSchema = z.object({
  zona_id: z.string(),
  lat_centro: z.number(),
  lon_centro: z.number(),
  prob_formalizacion: z.number(),
  score_100: z.number(),
  nivel: z.string(),
});
export const zonaListSchema = z.array(zonaSchema);
export type Zona = z.infer<typeof zonaSchema>;

/** Escala de la capa de probabilidad (verde = bajo → rojo = muy alto). */
export const NIVELES_PROBABILIDAD = [
  { nivel: 'Bajo', rango: '0–25%', color: '#22c55e' },
  { nivel: 'Medio', rango: '25–50%', color: '#eab308' },
  { nivel: 'Alto', rango: '50–75%', color: '#f97316' },
  { nivel: 'Muy Alto', rango: '75–100%', color: '#dc2626' },
] as const;

/** Color de una celda según su score 0–100 (mismos cortes que `nivel` del backend). */
export function colorZona(score: number): string {
  if (score < 25) return '#22c55e';
  if (score < 50) return '#eab308';
  if (score < 75) return '#f97316';
  return '#dc2626';
}
