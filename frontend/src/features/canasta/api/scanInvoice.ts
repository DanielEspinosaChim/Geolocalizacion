import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { comprimirImagen } from '../lib/comprimirImagen';
import { scanRespuestaSchema, type ScanItem } from '../model/canasta';

/**
 * Sube una foto de factura al backend, que la manda a la IA de visión y devuelve
 * los productos detectados con su nivel de confianza. Multipart, no JSON.
 */
export function useEscanearFactura(year: string) {
  return useMutation({
    mutationFn: async (file: File): Promise<ScanItem[]> => {
      // Comprimir antes de subir: evita timeouts con fotos de galería (10-20 MB)
      // y Gemini lee mejor imágenes limpias (≤2 MB). Aplica a cualquier origen.
      const comprimida = await comprimirImagen(file);
      const form = new FormData();
      form.append('imagen', comprimida);
      const data = await apiClient.postForm<unknown>(`/canasta/${year}/scan-invoice`, form);
      return scanRespuestaSchema.parse(data).items;
    },
    meta: { errorMessage: 'No se pudo analizar la imagen' },
  });
}
