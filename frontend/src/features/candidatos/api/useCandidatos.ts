import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { candidatoListSchema } from '../model/candidato';

export const candidatosKeys = {
  all: ['candidatos'] as const,
  cacheStatus: ['candidatos', 'cache-status'] as const,
};

export function useCandidatos() {
  return useQuery({
    queryKey: candidatosKeys.all,
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/candidatos', { signal });
      return candidatoListSchema.parse(data);
    },
    staleTime: 60_000,
  });
}
