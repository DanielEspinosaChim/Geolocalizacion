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
  // Metadata de compra por mes: dónde y qué día se levantó el precio.
  tiendas: z.record(z.string(), z.string().nullable()).catch({}),
  fechas_compra: z.record(z.string(), z.string().nullable()).catch({}),
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

/** Modo de vista de la tabla: precios capturados, variación % o trimestres. */
export type VistaCanasta = 'precios' | 'variacion' | 'trimestres';

export interface Trimestre {
  key: string;
  label: string;
  months: readonly Mes[];
}

/** Trimestres calendario (mismos cortes que el módulo original). */
export const QUARTERS: readonly Trimestre[] = [
  { key: 'Q1', label: 'Q1 · ENE–MAR', months: ['jan', 'feb', 'mar'] },
  { key: 'Q2', label: 'Q2 · ABR–JUN', months: ['apr', 'may', 'jun'] },
  { key: 'Q3', label: 'Q3 · JUL–SEP', months: ['jul', 'aug', 'sep'] },
  { key: 'Q4', label: 'Q4 · OCT–DIC', months: ['oct', 'nov', 'dec'] },
];

/**
 * Trimestres con al menos un mes seleccionado. Si hay más de uno, agrega la
 * columna sintética "PROMEDIO ANUAL" que abarca todos los meses activos.
 */
export function trimestresActivos(meses: readonly Mes[]): Trimestre[] {
  const activos = QUARTERS.filter((q) => q.months.some((m) => meses.includes(m)));
  if (activos.length > 1) {
    const all = activos.flatMap((q) => q.months.filter((m) => meses.includes(m)));
    activos.push({ key: 'ANUAL', label: 'PROMEDIO ANUAL', months: all });
  }
  return activos;
}

/**
 * Promedio simple por trimestre de los precios de un producto, considerando
 * solo los meses seleccionados; null si el trimestre no tiene ningún precio.
 */
export function promediosTrimestrales(
  prices: Producto['prices'],
  trimestres: readonly Trimestre[],
  meses: readonly Mes[],
): (number | null)[] {
  return trimestres.map((q) => {
    const vals = q.months
      .filter((m) => meses.includes(m))
      .map((m) => prices[m])
      .filter((v): v is number => v != null);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  });
}

/**
 * Fila trimestral del pie: promedia los TOTALES mensuales de la canasta (no
 * los promedios por producto), igual que el módulo original.
 */
export function promediosTrimestralesCanasta(
  productos: Producto[],
  trimestres: readonly Trimestre[],
  meses: readonly Mes[],
): (number | null)[] {
  const totales = totalesPorMes(productos, meses);
  return trimestres.map((q) => {
    const vals = q.months
      .filter((m) => meses.includes(m))
      .map((m) => totales[meses.indexOf(m)])
      .filter((v): v is number => v != null);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  });
}

/** Día del mes (1–31) de una fecha `YYYY-MM-DD`; null si no hay o es inválida. */
export function diaDeFecha(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const dia = Number(fecha.split('-')[2]);
  return Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null;
}

/** Fecha de compra `YYYY-MM-DD` a partir de año, mes de la columna y día capturado. */
export function fechaCompra(year: string, month: Mes, dia: number): string {
  const mm = String(MESES.indexOf(month) + 1).padStart(2, '0');
  return `${year}-${mm}-${String(dia).padStart(2, '0')}`;
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

/** Monto con separador de miles y 2 decimales, ej. "$1,210.31". */
export function formatoMoneda(v: number): string {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
