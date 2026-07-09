import { z } from 'zod';

export const cacheStatusSchema = z.object({
  ready: z.boolean(),
  loading: z.boolean(),
  count: z.number(),
  status: z.string(),
});

export const metricasSchema = z.object({
  total: z.number(),
  formales: z.number(),
  informales: z.number(),
  pct_informal: z.number(),
  score_prom: z.number(),
  dist_prom_m: z.number(),
  top_tipos: z.array(z.tuple([z.string(), z.number()])),
});

export type CacheStatus = z.infer<typeof cacheStatusSchema>;
export type Metricas = z.infer<typeof metricasSchema>;
