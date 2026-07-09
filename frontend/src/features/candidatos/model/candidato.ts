import { z } from 'zod';

/** Estado de formalización. En la API, `tipo` null/ausente = informal. */
export const TIPOS = ['informal', 'en_proceso', 'formal'] as const;
export type Tipo = (typeof TIPOS)[number];

export const candidatoSchema = z.object({
  place_id: z.string(),
  nombre: z.string().catch('(sin nombre)'),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  /** CSV de categorías de Google (ej. "restaurant,food") — no confundir con `tipo`. */
  tipos: z.string().nullish(),
  tipo: z.enum(TIPOS).nullish().catch(null),
  fecha_actualizacion: z.string().nullish(),
  /** La colonia viaja por nombre, no por id — ver `coloniaDe()` en model/filtros.ts. */
  colonia_nombre: z.string().nullish(),
  colonia_denue: z.string().nullish(),
});

export const candidatoListSchema = z.array(candidatoSchema);
export type Candidato = z.infer<typeof candidatoSchema>;

export function tipoDe(c: Pick<Candidato, 'tipo'>): Tipo {
  return c.tipo ?? 'informal';
}

export const TIPO_LABELS: Record<Tipo, string> = {
  informal: 'Informal',
  en_proceso: 'En proceso',
  formal: 'Formal',
};

/** Mismos valores que los tokens --danger/--warning/--success (Leaflet pinta en canvas). */
export const TIPO_COLORS: Record<Tipo, string> = {
  informal: '#dc2626',
  en_proceso: '#f97316',
  formal: '#22c55e',
};

export const TIPO_TONES = {
  informal: 'danger',
  en_proceso: 'warning',
  formal: 'success',
} as const;
