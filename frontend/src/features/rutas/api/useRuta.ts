import { useMutation } from '@tanstack/react-query';
import { http } from '@core/api';
import { toast } from '@shared/ui';
import { rutaSchema } from '../model/ruta';

export function useCalcularRuta() {
  return useMutation({
    mutationFn: async (placeIds: string[]) => {
      const { data } = await http.post<unknown>('/ruta', { place_ids: placeIds });
      return rutaSchema.parse(data);
    },
    onError: (e) => toast.error(e.message || 'Error calculando la ruta'),
  });
}

export function useCalcularRutaColonia() {
  return useMutation({
    mutationFn: async ({ colonia, limite }: { colonia: string; limite: number }) => {
      const { data } = await http.post<unknown>('/ruta-colonia', { colonia, limite });
      return rutaSchema.parse(data);
    },
    onError: (e) => toast.error(e.message || 'Error calculando la ruta'),
  });
}

/** Descarga el reporte de visita (HTML) generado por el backend. */
export async function descargarReporteVisita(placeIds: string[]): Promise<void> {
  const { data } = await http.post<Blob>(
    '/reporte-visita',
    { place_ids: placeIds, fecha_visita: new Date().toISOString().slice(0, 10) },
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reporte_visita.html';
  a.click();
  URL.revokeObjectURL(url);
}
