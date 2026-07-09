import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { zonaListSchema } from '../model/zona';

/**
 * Zonas ML (~4000 celdas de 500m) para la capa de calor de probabilidad.
 * Solo se pide cuando el componente que la usa se monta (capa activa).
 * Requiere `predicciones_zonas.csv` en el backend; si falta, responde 404.
 */
export function useZonas() {
  return useQuery({
    queryKey: ['zonas'],
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/zonas', { signal });
      return zonaListSchema.parse(data);
    },
    staleTime: Infinity,
  });
}
