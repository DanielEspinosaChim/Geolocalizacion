import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, NotModifiedError } from '@shared/api';
import { metricasSchema, type Metricas } from '../model/metricas';
import { candidatosKeys } from './useCandidatos';

/**
 * Consume GET /api/metricas con soporte de ETag.
 * Si el servidor responde 304, devuelve los datos previamente cacheados
 * por TanStack Query sin forzar re-render ni mostrar loader.
 */
export function useMetricas() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: candidatosKeys.metricas,
    queryFn: async ({ signal }) => {
      try {
        const data = await apiClient.get<unknown>('/metricas', { signal });
        return metricasSchema.parse(data);
      } catch (err) {
        if (err instanceof NotModifiedError) {
          const cached = queryClient.getQueryData<Metricas>(candidatosKeys.metricas);
          if (cached) return cached;
        }
        throw err;
      }
    },
    staleTime: 30_000,
  });
}
