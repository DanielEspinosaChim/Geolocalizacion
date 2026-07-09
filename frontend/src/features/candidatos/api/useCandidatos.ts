import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, NotModifiedError } from '@shared/api';
import { candidatoListSchema, type Candidato } from '../model/candidato';

export const candidatosKeys = {
  all: ['candidatos'] as const,
  cacheStatus: ['candidatos', 'cache-status'] as const,
  metricas: ['candidatos', 'metricas'] as const,
  validacion: ['candidatos', 'validacion'] as const,
};

export function useCandidatos() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: candidatosKeys.all,
    queryFn: async ({ signal }) => {
      try {
        const data = await apiClient.get<unknown>('/candidatos', { signal });
        return candidatoListSchema.parse(data);
      } catch (err) {
        if (err instanceof NotModifiedError) {
          const cached = queryClient.getQueryData<Candidato[]>(candidatosKeys.all);
          if (cached) return cached;
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });
}
