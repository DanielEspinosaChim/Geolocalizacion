import { z } from 'zod';

const escenarioSchema = z.object({
  etiqueta: z.string().catch(''),
  alpha: z.number().catch(0),
  indice_pct: z.number().catch(0),
  N_inf_estimado: z.number().catch(0),
});

/** Las 4 fuentes y sus cruces — insumo de los pasos 1 a 4 de la metodología. */
const fuentesSchema = z.object({
  gmaps_csv: z.number().catch(0),
  gmaps_raw: z.number().catch(0),
  gmaps_limpio: z.number().catch(0),
  osm_total: z.number().catch(0),
  osm_denue: z.number().catch(0),
  osm_canaco: z.number().catch(0),
  gm_denue: z.number().catch(0),
  gm_canaco: z.number().catch(0),
  denue_total: z.number().catch(0),
  canaco_total: z.number().catch(0),
  gm_osm_overlap: z.number().catch(0),
});

/** Captura-recaptura (Chapman): GMaps × OSM, sin asumir ningún α de visibilidad. */
const chapmanSchema = z.object({
  n1_gmaps_limpio: z.number().catch(0),
  n2_osm: z.number().catch(0),
  overlap: z.number().catch(0),
  n_denue_ancla: z.number().catch(0),
  N_estimado_total: z.number().catch(0),
  N_inf_estimado: z.number().catch(0),
  indice_pct: z.number().catch(0),
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
  fuentes: fuentesSchema.catch({
    gmaps_csv: 0,
    gmaps_raw: 0,
    gmaps_limpio: 0,
    osm_total: 0,
    osm_denue: 0,
    osm_canaco: 0,
    gm_denue: 0,
    gm_canaco: 0,
    denue_total: 0,
    canaco_total: 0,
    gm_osm_overlap: 0,
  }),
  chapman: chapmanSchema.catch({
    n1_gmaps_limpio: 0,
    n2_osm: 0,
    overlap: 0,
    n_denue_ancla: 0,
    N_estimado_total: 0,
    N_inf_estimado: 0,
    indice_pct: 0,
  }),
});
export type Indice = z.infer<typeof indiceSchema>;

export interface EscenarioVivo {
  /** Informales estimados con los conteos de campo ya aplicados. */
  nInfEstimado: number;
  indicePct: number;
  /** Cifra base (sin validaciones de campo) del mismo escenario, para comparar. */
  basePct: number;
  /** Diferencia en puntos porcentuales contra esa base. */
  deltaPp: number;
}

export interface IndiceRecalculado {
  /** Informales observados tras descontar los ya marcados formal / en proceso. */
  ninfObs: number;
  ninfObsBase: number;
  formales: number;
  enProceso: number;
  /** Chapman no usa validaciones de campo (solo GMaps/OSM): es fijo. */
  chapmanPct: number;
  central: EscenarioVivo;
  limiteSuperior: EscenarioVivo;
}

function escenarioVivo(indice: Indice, alpha: number, ninfObs: number, basePct: number): EscenarioVivo {
  const pFormal = indice.cobertura_gmaps_pct / 100;
  const pInf = alpha * pFormal;
  const nInfEstimado = pInf > 0 ? Math.round(ninfObs / pInf) : 0;
  const n1 = indice.datos_entrada.N1_denue;
  const indicePct = nInfEstimado + n1 > 0 ? (nInfEstimado / (n1 + nInfEstimado)) * 100 : 0;
  return {
    nInfEstimado,
    indicePct: Math.round(indicePct * 10) / 10,
    basePct,
    // `|| 0` normaliza el -0 que produce Math.round sobre diferencias negativas ínfimas.
    deltaPp: Math.round((indicePct - basePct) * 10) / 10 || 0,
  };
}

/**
 * Reaplica el multiplier method descontando los negocios que el equipo ya marcó
 * como formales o en proceso en el mapa: cada uno deja de contar como informal
 * observado y mueve la estimación de los escenarios α=0.65 (central) y α=0.40
 * (límite superior realista). El Chapman queda fuera: solo depende de GMaps/OSM,
 * no de las validaciones manuales, así que se pasa igual que llegó de la API.
 */
export function recalcularIndice(
  indice: Indice,
  formales: number,
  enProceso: number,
): IndiceRecalculado {
  const ninfObsBase = indice.datos_entrada.n_inf_observados;
  const ninfObs = Math.max(0, ninfObsBase - formales - enProceso);
  const baseCentral = indice.escenarios.find((e) => e.alpha === 0.65)?.indice_pct ?? 0;
  const baseSuperior = indice.escenarios.find((e) => e.alpha === 0.4)?.indice_pct ?? 0;

  return {
    ninfObs,
    ninfObsBase,
    formales,
    enProceso,
    chapmanPct: indice.chapman.indice_pct,
    central: escenarioVivo(indice, 0.65, ninfObs, baseCentral),
    limiteSuperior: escenarioVivo(indice, 0.4, ninfObs, baseSuperior),
  };
}
