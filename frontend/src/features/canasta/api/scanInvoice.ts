import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { scanRespuestaSchema, type ScanItem } from '../model/canasta';

/**
 * Sube una foto de factura al backend, que la manda a la IA de visión y devuelve
 * los productos detectados con su nivel de confianza. Multipart, no JSON.
 */
export function useEscanearFactura(year: string) {
  return useMutation({
    mutationFn: async (file: File): Promise<ScanItem[]> => {
      const form = new FormData();
      form.append('imagen', file);
      const data = await apiClient.postForm<unknown>(`/canasta/${year}/scan-invoice`, form);
      return scanRespuestaSchema.parse(data).items;
    },
    meta: { errorMessage: 'No se pudo analizar la imagen' },
  });
}
