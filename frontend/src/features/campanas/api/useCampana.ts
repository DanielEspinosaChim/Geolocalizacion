import { useQuery } from '@tanstack/react-query';
import { http } from '@core/api';
import { detalleCampanaSchema } from '../model/campana';
import { campanasKeys } from './keys';

export function useCampana(id: string | null) {
  return useQuery({
    queryKey: campanasKeys.detail(id ?? ''),
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const { data } = await http.get<unknown>(`/campanas/${id}`, { signal });
      return detalleCampanaSchema.parse(data);
    },
    staleTime: 10_000,
  });
}
