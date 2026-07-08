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
