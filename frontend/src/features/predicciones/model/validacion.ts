import { z } from 'zod';

const matchSchema = z.object({
  nombre: z.string().catch('—'),
  nombre_denue: z.string().nullish(),
  fuzzy_score: z.number().catch(0),
  distancia_m: z.number().catch(9999),
});

const noMatchSchema = z.object({
  nombre: z.string().catch('—'),
  tipos: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
});

export const validacionSchema = z.object({
  matches: z.array(matchSchema).catch([]),
  no_matches: z.array(noMatchSchema).catch([]),
});
export type Validacion = z.infer<typeof validacionSchema>;
