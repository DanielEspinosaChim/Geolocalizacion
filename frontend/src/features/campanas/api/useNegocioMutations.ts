import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { campanasKeys } from './keys';

/** Parche parcial sobre un negocio de campaña (completado, notas, fecha, gps…). */
export function usePatchNegocio(campanaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      negocioId,
      updates,
    }: {
      negocioId: string;
      updates: Record<string, unknown>;
    }) => {
      await apiClient.patch(
        `/campanas/${campanaId}/negocios/${encodeURIComponent(negocioId)}`,
        updates,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: campanasKeys.detail(campanaId) }),
    meta: { errorMessage: 'Error al actualizar el negocio' },
  });
}
