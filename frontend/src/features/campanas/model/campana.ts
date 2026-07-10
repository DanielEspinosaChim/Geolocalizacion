import { z } from 'zod';

export const STATUS_CAMPANA = ['activa', 'cerrada', 'cancelada'] as const;
export type StatusCampana = (typeof STATUS_CAMPANA)[number];

export const STATUS_META: Record<
  StatusCampana,
  { label: string; tone: 'info' | 'neutral' | 'danger' }
> = {
  activa: { label: 'Activa', tone: 'info' },
  cerrada: { label: 'Finalizada', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'danger' },
};

export const campanaSchema = z.object({
  id: z.string(),
  nombre: z.string().catch('(sin nombre)'),
  descripcion: z.string().nullish(),
  colonia: z.string().nullish(),
  fecha_inicio: z.string().nullish(),
  fecha_fin: z.string().nullish(),
  status: z.enum(STATUS_CAMPANA).catch('activa'),
  asignado_a: z.string().nullish(),
  asignado_nombre: z.string().nullish(),
  total_negocios: z.number().catch(0),
  total_completados: z.number().catch(0),
  created_at: z.string().nullish(),
});
export const campanaListSchema = z.array(campanaSchema);
export type Campana = z.infer<typeof campanaSchema>;

/** Negocio dentro de una campaña (documento de la subcolección). */
export const negocioSchema = z.object({
  negocio_id: z.string(),
  nombre: z.string().catch('(sin nombre)'),
  tipo: z.string().nullish(),
  tipos: z.string().nullish(),
  completado: z.boolean().catch(false),
  notas: z.string().nullish(),
  fecha_visita: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  colonia: z.string().nullish(),
  direccion: z.string().nullish(),
  visita_datos: z.record(z.string(), z.unknown()).nullish(),
  plantilla_id: z.string().nullish(),
  foto_visita_url: z.string().nullish(),
  visita_lat: z.number().nullish(),
  visita_lng: z.number().nullish(),
  visita_distancia: z.number().nullish(),
  visita_direccion: z.string().nullish(),
});
export type NegocioCampana = z.infer<typeof negocioSchema>;

export const detalleCampanaSchema = z.object({
  campana: campanaSchema,
  negocios: z.array(negocioSchema).catch([]),
});
export type DetalleCampana = z.infer<typeof detalleCampanaSchema>;

export interface Progreso {
  total: number;
  hecho: number;
  pendientes: number;
  pct: number;
  completa: boolean;
}

export function progresoDe(c: Pick<Campana, 'total_negocios' | 'total_completados'>): Progreso {
  const total = c.total_negocios;
  const hecho = c.total_completados;
  const pct = total > 0 ? Math.round((hecho / total) * 100) : 0;
  return { total, hecho, pendientes: total - hecho, pct, completa: pct === 100 && total > 0 };
}

/** Semáforo de la distancia de verificación GPS (≤100 ok, ≤300 dudoso, >300 lejos). */
export function toneVerificacion(distanciaM: number): 'success' | 'warning' | 'danger' {
  return distanciaM <= 100 ? 'success' : distanciaM <= 300 ? 'warning' : 'danger';
}

/** Una ruta necesita al menos dos paradas (lo valida también el backend). */
export const MIN_PARADAS_CAMPANA = 2;
