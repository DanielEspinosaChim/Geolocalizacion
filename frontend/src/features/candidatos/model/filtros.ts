import { tipoDe, type Candidato, type Tipo } from './candidato';
import { giroEs, GIROS_GENERICOS } from './giros';

export interface Filtros {
  q: string;
  tipo: Tipo | null;
  /** Nombre de colonia en MAYÚSCULAS (id del select) o null = todas. */
  colonia: string | null;
}

export const SIN_FILTROS: Filtros = { q: '', tipo: null, colonia: null };

/** Misma regla que el backend: colonia_nombre || colonia_denue, en mayúsculas. */
export function coloniaDe(c: Pick<Candidato, 'colonia_nombre' | 'colonia_denue'>): string {
  return (c.colonia_nombre ?? c.colonia_denue ?? '').toUpperCase();
}

export function filtrarCandidatos(data: Candidato[], { q, tipo, colonia }: Filtros): Candidato[] {
  const texto = q.trim().toLowerCase();
  if (!texto && !tipo && !colonia) return data;
  return data.filter(
    (c) =>
      (!texto || c.nombre.toLowerCase().includes(texto)) &&
      (!tipo || tipoDe(c) === tipo) &&
      (!colonia || coloniaDe(c) === colonia),
  );
}

export interface Metricas {
  total: number;
  formales: number;
  enProceso: number;
  informales: number;
  pctInformales: number;
  topGiros: [string, number][];
}

/** Métricas locales del conjunto visible (paridad con _renderMetricasLocales). */
export function calcularMetricas(data: Candidato[]): Metricas {
  const total = data.length;
  const formales = data.filter((c) => tipoDe(c) === 'formal').length;
  const enProceso = data.filter((c) => tipoDe(c) === 'en_proceso').length;
  const informales = total - formales - enProceso;
  const pctInformales = total > 0 ? Math.round((informales / total) * 1000) / 10 : 0;

  // Se agrupa por la etiqueta ya traducida, no por la clave: `gym` y
  // `fitness_center` son ambos "Gimnasio" y deben sumar en la misma fila.
  const conteo = new Map<string, number>();
  for (const c of data) {
    if (tipoDe(c) === 'formal') continue;
    for (const crudo of (c.tipos ?? '').split(',')) {
      const giro = crudo.trim();
      if (GIROS_GENERICOS.has(giro)) continue;
      const etiqueta = giroEs(giro);
      conteo.set(etiqueta, (conteo.get(etiqueta) ?? 0) + 1);
    }
  }
  const topGiros = [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  return { total, formales, enProceso, informales, pctInformales, topGiros };
}
