import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, NotModifiedError } from '@shared/api';
import { productoListSchema, type Producto } from '../model/canasta';

export const canastaKeys = {
  all: ['canasta'] as const,
  year: (year: string) => ['canasta', year] as const,
};

/** Productos activos del año, ya ordenados por categoría y sort_order (backend). */
export function useCanasta(year: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: canastaKeys.year(year),
    queryFn: async ({ signal }) => {
      try {
        const data = await apiClient.get<unknown>(`/canasta/${year}`, { signal });
        return productoListSchema.parse(data);
      } catch (err) {
        if (err instanceof NotModifiedError) {
          const cached = queryClient.getQueryData<Producto[]>(canastaKeys.year(year));
          if (cached) return cached;
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });
}
