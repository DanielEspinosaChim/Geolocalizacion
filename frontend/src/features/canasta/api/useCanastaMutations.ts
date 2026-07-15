import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import type { Mes } from '../model/canasta';
import { canastaKeys } from './useCanasta';

/**
 * Mutaciones del catálogo. Todas invalidan la query del año para releer el
 * estado real del backend — el catálogo es pequeño y la relectura es barata.
 */

export function useActualizarPrecio(year: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, month, price }: { id: string; month: Mes; price: number | null }) =>
      apiClient.put(`/canasta/${year}/${id}`, { month, price }),
    onSuccess: () => qc.invalidateQueries({ queryKey: canastaKeys.year(year) }),
    meta: { errorMessage: 'No se pudo guardar el precio' },
  });
}

/**
 * Metadata de compra de una celda (tienda + fecha). El PUT del backend es el
 * mismo de precio, así que se reenvía el precio vigente para no borrarlo.
 */
export function useActualizarMetadata(year: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      id: string;
      month: Mes;
      price: number | null;
      tienda: string | null;
      fecha_compra: string | null;
    }) =>
      apiClient.put(`/canasta/${year}/${body.id}`, {
        month: body.month,
        price: body.price,
        tienda: body.tienda,
        fecha_compra: body.fecha_compra,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: canastaKeys.year(year) }),
    meta: { errorMessage: 'No se pudo guardar la tienda/fecha' },
  });
}

export function useAgregarProducto(year: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; category: string; unit: string }) =>
      apiClient.post(`/canasta/${year}/product`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: canastaKeys.year(year) }),
    meta: { errorMessage: 'No se pudo agregar el producto' },
  });
}

export function useEliminarProducto(year: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/canasta/${year}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: canastaKeys.year(year) }),
    meta: { errorMessage: 'No se pudo desactivar el producto' },
  });
}

export function useSeedCanasta(year: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ insertados: number; ya_existian: number }>(
      `/canasta/${year}/seed`,
      {},
    ),
    onSuccess: () => qc.invalidateQueries({ queryKey: canastaKeys.year(year) }),
    meta: { errorMessage: 'No se pudieron cargar los datos históricos' },
  });
}
