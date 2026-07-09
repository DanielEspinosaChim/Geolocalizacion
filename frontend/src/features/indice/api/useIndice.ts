import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { indiceSchema } from '../model/indice';

export const indiceKeys = {
  all: ['indice'] as const,
};

/**
 * GET /api/indice — anclas del cruce y escenarios del estimador de razón.
 * Son constantes del método (solo cambian al re-correr `cruce.py`), de ahí el
 * staleTime largo.
 */
export function useIndice() {
  return useQuery({
    queryKey: indiceKeys.all,
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/indice', { signal });
      return indiceSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}
