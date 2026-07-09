import { z } from 'zod';

export const matchValidacionSchema = z.object({
  nombre: z.string(),
  nombre_denue: z.string(),
  fuzzy_score: z.number(),
  distancia_m: z.number(),
});

export const muestraValidacionSchema = z.object({
  matches: z.array(matchValidacionSchema),
});

export type MatchValidacion = z.infer<typeof matchValidacionSchema>;
export type MuestraValidacion = z.infer<typeof muestraValidacionSchema>;
