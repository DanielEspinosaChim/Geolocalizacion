import { z } from 'zod';

const escenarioSchema = z.object({
  etiqueta: z.string().catch(''),
  alpha: z.number().catch(0),
  indice_pct: z.number().catch(0),
  N_inf_estimado: z.number().catch(0),
});

export const indiceSchema = z.object({
  datos_entrada: z.object({
    N1_denue: z.number().catch(0),
    m_overlap: z.number().catch(0),
    n_formales_total: z.number().catch(0),
    /** Formales por cadena / tipo de GMaps / institución. */
    n_formales_otros: z.number().catch(0),
    /** Formales confirmados contra BASE.xlsx (RFC + licencias municipales). */
    n_formales_base: z.number().catch(0),
    n_inf_observados: z.number().catch(0),
    n_gmaps_negocios: z.number().catch(0),
    n_gmaps_csv: z.number().catch(0),
  }),
  cobertura_gmaps_pct: z.number().catch(0),
  multiplicador: z.number().catch(0),
  central_indice_pct: z.number().catch(0),
  ic95_indice_inferior: z.object({ low: z.number(), high: z.number() }),
  escenarios: z.array(escenarioSchema).catch([]),
  metodo: z.string().catch(''),
  referencia_inegi: z.string().nullish(),
  referencias: z.array(z.string()).catch([]),
});
export type Indice = z.infer<typeof indiceSchema>;

/** Colores por escenario (índice inferior → superior). */
export const ESCENARIO_COLORS = ['#94a3b8', '#60a5fa', '#f59e0b', '#f87171'];

export interface IndiceRecalculado {
  /** Informales observados tras descontar los ya marcados formal / en proceso. */
  ninfObs: number;
  ninfObsBase: number;
  ninfEstimado: number;
  ninfEstimadoBase: number;
  indicePct: number;
  indiceBasePct: number;
  /** Diferencia en puntos porcentuales contra el cálculo base. */
  deltaPp: number;
}

/**
 * Reaplica el estimador de razón descontando los negocios que el equipo ya marcó
 * como formales o en proceso en el mapa: cada uno deja de contar como informal
 * observado y, multiplicado por el factor N1/m, mueve la estimación del universo.
 *
 * Se compara contra el escenario α=1.0 (límite inferior), que es el que no asume
 * ningún sesgo de visibilidad y por tanto sirve de línea base conservadora.
 */
export function recalcularIndice(
  indice: Indice,
  formales: number,
  enProceso: number,
): IndiceRecalculado {
  const { N1_denue: n1, m_overlap: m, n_inf_observados: ninfObsBase } = indice.datos_entrada;
  const base = indice.escenarios[0];

  const ninfObs = Math.max(0, ninfObsBase - formales - enProceso);
  const multiplicador = m > 0 ? n1 / m : 0;
  const ninfEstimado = Math.round(ninfObs * multiplicador);
  const indicePct = ninfEstimado + n1 > 0 ? (ninfEstimado / (ninfEstimado + n1)) * 100 : 0;
  const indiceBasePct = base?.indice_pct ?? 0;

  return {
    ninfObs,
    ninfObsBase,
    ninfEstimado,
    ninfEstimadoBase: base?.N_inf_estimado ?? Math.round(ninfObsBase * multiplicador),
    indicePct: Math.round(indicePct * 10) / 10,
    indiceBasePct,
    // `|| 0` normaliza el -0 que produce Math.round sobre diferencias negativas ínfimas.
    deltaPp: Math.round((indicePct - indiceBasePct) * 10) / 10 || 0,
  };
}
