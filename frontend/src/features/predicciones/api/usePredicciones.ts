import { useMutation, useQuery } from '@tanstack/react-query';
import { http } from '@core/api';
import { indiceSchema } from '../model/indice';
import { prediccionSchema } from '../model/prediccion';
import { validacionSchema } from '../model/validacion';

/** Predicción puntual al hacer clic en el mapa. */
export function usePredecir() {
  return useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const { data } = await http.get<unknown>('/predecir', { params: { lat, lng } });
      return prediccionSchema.parse(data);
    },
  });
}

export function useIndice() {
  return useQuery({
    queryKey: ['indice'],
    queryFn: async ({ signal }) => {
      const { data } = await http.get<unknown>('/indice', { signal });
      return indiceSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useMuestraValidacion() {
  return useQuery({
    queryKey: ['muestra-validacion'],
    queryFn: async ({ signal }) => {
      const { data } = await http.get<unknown>('/muestra-validacion', { signal });
      return validacionSchema.parse(data);
    },
    staleTime: 5 * 60_000,
  });
}
