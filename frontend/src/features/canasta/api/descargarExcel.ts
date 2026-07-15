import { http } from '@core/api';
import type { Mes } from '../model/canasta';

/**
 * Descarga el Excel del año. Usa `http` directo (no apiClient) porque necesita
 * la respuesta binaria (blob), igual que `descargarReporteVisita` en rutas.
 *
 * Manda los meses seleccionados (`?meses=jan,feb,…`, mismas claves que usa el
 * backend) y, si hay año de comparación, `&compare=<yearB>`.
 */
export async function descargarExcelCanasta(
  year: string,
  meses: readonly Mes[],
  compare?: string | null,
): Promise<void> {
  const params = new URLSearchParams({ meses: meses.join(',') });
  if (compare) params.set('compare', compare);
  const { data } = await http.get<Blob>(`/canasta/${year}/export/excel?${params}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canasta_basica_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
