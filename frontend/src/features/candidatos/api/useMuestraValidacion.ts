import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, NotModifiedError } from '@shared/api';
import { muestraValidacionSchema, type MuestraValidacion } from '../model/validacion';
import { candidatosKeys } from './useCandidatos';

/**
 * Consume GET /api/muestra-validacion con soporte de ETag.
 * Devuelve un arreglo de matches (nombre vs nombre_denue, fuzzy_score, distancia).
 */
export function useMuestraValidacion() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: candidatosKeys.validacion,
    queryFn: async ({ signal }) => {
      try {
        const data = await apiClient.get<unknown>('/muestra-validacion', { signal });
        return muestraValidacionSchema.parse(data);
      } catch (err) {
        if (err instanceof NotModifiedError) {
          const cached = queryClient.getQueryData<MuestraValidacion>(candidatosKeys.validacion);
          if (cached) return cached;
        }
        throw err;
      }
    },
    staleTime: 120_000,
  });
}
