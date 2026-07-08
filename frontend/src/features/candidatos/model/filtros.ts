import { tipoDe, type Candidato, type Tipo } from './candidato';
import { GIROS_ES, GIROS_GENERICOS } from './giros';

export interface Filtros {
  q: string;
  tipo: Tipo | null;
}

export const SIN_FILTROS: Filtros = { q: '', tipo: null };

export function filtrarCandidatos(data: Candidato[], { q, tipo }: Filtros): Candidato[] {
  const texto = q.trim().toLowerCase();
  if (!texto && !tipo) return data;
  return data.filter(
    (c) =>
      (!texto || c.nombre.toLowerCase().includes(texto)) && (!tipo || tipoDe(c) === tipo),
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

  const conteo = new Map<string, number>();
  for (const c of data) {
    if (tipoDe(c) === 'formal') continue;
    for (const crudo of (c.tipos ?? '').split(',')) {
      const giro = crudo.trim();
      if (!GIROS_GENERICOS.has(giro)) conteo.set(giro, (conteo.get(giro) ?? 0) + 1);
    }
  }
  const topGiros = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([giro, n]): [string, number] => [GIROS_ES[giro] ?? giro, n]);

  return { total, formales, enProceso, informales, pctInformales, topGiros };
}
