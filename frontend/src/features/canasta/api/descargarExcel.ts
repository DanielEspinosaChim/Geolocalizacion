import { http } from '@core/api';

/**
 * Descarga el Excel del año. Usa `http` directo (no apiClient) porque necesita
 * la respuesta binaria (blob), igual que `descargarReporteVisita` en rutas.
 */
export async function descargarExcelCanasta(year: string): Promise<void> {
  const { data } = await http.get<Blob>(`/canasta/${year}/export/excel`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canasta_basica_${year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
