import { z } from 'zod';

/** Respuesta de /api/predecir — unión por `status`. */
export const prediccionSchema = z.object({
  status: z.enum(['formal', 'informal', 'en_proceso', 'zona', 'sin_datos']).catch('sin_datos'),
  nombre: z.string().nullish(),
  tipos: z.string().nullish(),
  distancia_m: z.number().nullish(),
  zona_nivel: z.string().nullish(),
  zona_score: z.number().nullish(),
  dist_zona_m: z.number().nullish(),
  estimado: z.boolean().nullish(),
});
export type Prediccion = z.infer<typeof prediccionSchema>;

export const PREDICCION_META = {
  formal: { icon: '✅', label: 'Registrado en DENUE', tone: 'success' },
  en_proceso: { icon: '🟠', label: 'En proceso', tone: 'warning' },
  informal: { icon: '🔴', label: 'Candidato Informal', tone: 'danger' },
  zona: { icon: '📊', label: 'Zona analizada', tone: 'info' },
  sin_datos: { icon: '❓', label: 'Sin datos disponibles', tone: 'neutral' },
} as const;
