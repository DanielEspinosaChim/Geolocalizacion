import { z } from 'zod';

/**
 * Modelo de la Canasta Básica. Portado del módulo del compañero (vanilla JS) a
 * tipos + helpers puros; el backend es el mismo router `canasta.py`.
 */

export const MESES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;
export type Mes = (typeof MESES)[number];

/** Etiqueta corta en español, en el mismo orden que MESES. */
export const MES_LABELS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
] as const;

export function mesLabel(m: Mes): string {
  return MES_LABELS[MESES.indexOf(m)];
}

/** Orden y paleta de categorías (mismo criterio que el Excel de CANACO). */
export const CATEGORIAS = [
  'FRUTAS',
  'VEGETALES',
  'ABARROTES',
  'CARNES',
  'LECHES',
  'HIGIENE',
  'FARMACÉUTICOS',
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const PRIMER_ANIO = 2025;

export const productoSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string().catch(''),
  sort_order: z.number().catch(99),
  active: z.boolean().catch(true),
  // Precios por mes; ausente o null = sin capturar.
  prices: z.record(z.string(), z.number().nullable()).catch({}),
});
export type Producto = z.infer<typeof productoSchema>;

export const productoListSchema = z.array(productoSchema);

export interface ScanItem {
  detected_name: string;
  detected_price: number;
  detected_unit: string;
  matched_id: string | null;
  matched_name: string | null;
  confidence: 'high' | 'medium' | 'low';
  score: number;
}

export const scanRespuestaSchema = z.object({
  ok: z.boolean(),
  items: z.array(
    z.object({
      detected_name: z.string(),
      detected_price: z.number(),
      detected_unit: z.string().catch(''),
      matched_id: z.string().nullable(),
      matched_name: z.string().nullable(),
      confidence: z.enum(['high', 'medium', 'low']).catch('low'),
      score: z.number().catch(0),
    }),
  ),
  total_detected: z.number().catch(0),
});

/**
 * Meses que se muestran según el año: hasta el mes actual para el año en curso,
 * los 12 para años pasados, ninguno para años futuros. Réplica de la regla del
 * módulo original.
 */
export function mesesVisibles(year: string, hoy = new Date()): Mes[] {
  const anioActual = hoy.getFullYear().toString();
  if (year < anioActual) return [...MESES];
  if (year === anioActual) return MESES.slice(0, hoy.getMonth() + 1);
  return [];
}

/** Total de la canasta por mes; null si ningún producto tiene precio ese mes. */
export function totalesPorMes(productos: Producto[], meses: readonly Mes[]): (number | null)[] {
  return meses.map((m) => {
    const precios = productos
      .map((p) => p.prices[m])
      .filter((v): v is number => v != null);
    if (!precios.length) return null;
    return Math.round(precios.reduce((a, b) => a + b, 0) * 100) / 100;
  });
}

export interface VariacionMes {
  label: string;
  total: number;
  pct: number;
}

/** Variación % mes a mes, solo para los meses comparables (ambos con total). */
export function variaciones(totales: (number | null)[], meses: readonly Mes[]): VariacionMes[] {
  const out: VariacionMes[] = [];
  totales.forEach((t, i) => {
    const prev = totales[i - 1];
    if (i === 0 || t == null || prev == null || prev === 0) return;
    out.push({
      label: mesLabel(meses[i]),
      total: t,
      pct: Math.round(((t - prev) / prev) * 1000) / 10,
    });
  });
  return out;
}

/** ID de producto derivado del nombre, igual que el backend (minúsculas, _). */
export function slugProducto(name: string): string {
  return name.trim().toLowerCase().replace(/ /g, '_').replace(/[()]/g, '');
}

/** Lista de años seleccionables, del actual hacia atrás hasta PRIMER_ANIO. */
export function aniosDisponibles(hoy = new Date()): string[] {
  const actual = hoy.getFullYear();
  const out: string[] = [];
  for (let a = actual; a >= PRIMER_ANIO; a--) out.push(a.toString());
  return out;
}

/** Mes en curso como clave (para preseleccionar en el escaneo). */
export function mesActual(hoy = new Date()): Mes {
  return MESES[hoy.getMonth()];
}
