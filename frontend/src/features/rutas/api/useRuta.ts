import { useMutation } from '@tanstack/react-query';
import { http } from '@core/api';
import { apiClient } from '@shared/api';
import { rutaSchema } from '../model/ruta';

export function useCalcularRuta() {
  return useMutation({
    mutationFn: async (placeIds: string[]) => {
      const data = await apiClient.post<unknown>('/ruta', { place_ids: placeIds });
      return rutaSchema.parse(data);
    },
    meta: { errorMessage: 'Error calculando la ruta' },
  });
}

export function useCalcularRutaColonia() {
  return useMutation({
    mutationFn: async ({ colonia, limite }: { colonia: string; limite: number }) => {
      const data = await apiClient.post<unknown>('/ruta-colonia', { colonia, limite });
      return rutaSchema.parse(data);
    },
    meta: { errorMessage: 'Error calculando la ruta' },
  });
}

/**
 * Descarga el reporte de visita (HTML) generado por el backend. Usa `http`
 * directo porque necesita la respuesta binaria (blob), fuera del apiClient JSON.
 */
export async function descargarReporteVisita(
  placeIds: string[],
  campanaId?: string,
): Promise<void> {
  const { data } = await http.post<Blob>(
    '/reporte-visita',
    {
      place_ids: placeIds,
      fecha_visita: new Date().toISOString().slice(0, 10),
      ...(campanaId ? { campana_id: campanaId } : {}),
    },
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = campanaId ? `reporte_${campanaId.slice(0, 8)}.html` : 'reporte_visita.html';
  a.click();
  URL.revokeObjectURL(url);
}
