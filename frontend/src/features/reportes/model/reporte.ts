import { z } from 'zod';

export const TIPOS_REPORTE = ['bache', 'luminaria', 'basura', 'arbol', 'vandalism', 'otro'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export const STATUS_REPORTE = ['pendiente', 'en_proceso', 'resuelto'] as const;
export type StatusReporte = (typeof STATUS_REPORTE)[number];

export const reporteSchema = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_REPORTE).catch('otro'),
  status: z.enum(STATUS_REPORTE).catch('pendiente'),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  descripcion: z.string().nullish(),
  direccion: z.string().nullish(),
  fecha: z.string().nullish(),
  foto_url: z.string().nullish(),
  verificado_distancia: z.number().nullish(),
  verificado_fecha: z.string().nullish(),
});
export const reporteListSchema = z.array(reporteSchema);
export type Reporte = z.infer<typeof reporteSchema>;

/** Icono/color del marcador por tipo (los hex pintan divIcons de Leaflet). */
export const REPORTE_META: Record<TipoReporte, { emoji: string; color: string; label: string }> = {
  bache: { emoji: '🕳️', color: '#b45309', label: 'Bache' },
  luminaria: { emoji: '💡', color: '#ca8a04', label: 'Luminaria' },
  basura: { emoji: '🗑️', color: '#65a30d', label: 'Basura' },
  arbol: { emoji: '🌳', color: '#16a34a', label: 'Árbol' },
  vandalism: { emoji: '🔨', color: '#dc2626', label: 'Vandalismo' },
  otro: { emoji: '⚠️', color: '#6b7280', label: 'Otro' },
};

export const STATUS_META: Record<StatusReporte, { label: string; tone: 'danger' | 'warning' | 'success' }> = {
  pendiente: { label: 'Pendiente', tone: 'danger' },
  en_proceso: { label: 'En proceso', tone: 'warning' },
  resuelto: { label: 'Resuelto', tone: 'success' },
};

export function siguienteStatus(actual: StatusReporte): StatusReporte | null {
  if (actual === 'pendiente') return 'en_proceso';
  if (actual === 'en_proceso') return 'resuelto';
  return null;
}

/** Semáforo de distancia de verificación (≤100 ok, ≤300 dudoso, >300 lejos). */
export function toneVerificacion(distanciaM: number): 'success' | 'warning' | 'danger' {
  return distanciaM <= 100 ? 'success' : distanciaM <= 300 ? 'warning' : 'danger';
}
