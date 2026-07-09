import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { prediccionSchema } from '../model/prediccion';
import { validacionSchema } from '../model/validacion';

/** Predicción puntual al hacer clic en el mapa. */
export function usePredecir() {
  return useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const data = await apiClient.get<unknown>('/predecir', { params: { lat, lng } });
      return prediccionSchema.parse(data);
    },
    meta: { errorMessage: 'No se pudo predecir en ese punto' },
  });
}

export function useMuestraValidacion() {
  return useQuery({
    queryKey: ['muestra-validacion'],
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/muestra-validacion', { signal });
      return validacionSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}
