import { useQuery } from '@tanstack/react-query';
import type { GeoJsonObject } from 'geojson';
import { http } from '@core/api';
import { coloniaListSchema } from '../model/colonia';

export function useColonias() {
  return useQuery({
    queryKey: ['colonias'],
    queryFn: async ({ signal }) => {
      const { data } = await http.get<unknown>('/colonias', { signal });
      return coloniaListSchema.parse(data);
    },
    staleTime: Infinity, // catálogo estable durante la sesión
  });
}

/** GeoJSON de capas (colonias/AGEBs/municipios). Se carga solo al activar la capa. */
export function useGeoJsonLayer(nombre: string, url: string) {
  return useQuery({
    queryKey: ['geojson', nombre],
    queryFn: async ({ signal }) => {
      const { data } = await http.get<GeoJsonObject>(url, { signal });
      return data;
    },
    staleTime: Infinity,
  });
}
