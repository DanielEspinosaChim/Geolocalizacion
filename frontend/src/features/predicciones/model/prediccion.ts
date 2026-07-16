import { BarChart3, CheckCircle2, CircleDot, CircleHelp } from 'lucide-react';
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
  /** Centro de la zona ML (lo devuelve el backend para la respuesta 'zona'). */
  lat: z.number().nullish(),
  lng: z.number().nullish(),
});
export type Prediccion = z.infer<typeof prediccionSchema>;

export const PREDICCION_META = {
  formal: { Icon: CheckCircle2, label: 'Registrado en DENUE', tone: 'success' },
  en_proceso: { Icon: CircleDot, label: 'En proceso', tone: 'warning' },
  informal: { Icon: CircleDot, label: 'Candidato Informal', tone: 'danger' },
  zona: { Icon: BarChart3, label: 'Zona analizada', tone: 'info' },
  sin_datos: { Icon: CircleHelp, label: 'Sin datos disponibles', tone: 'neutral' },
} as const;
