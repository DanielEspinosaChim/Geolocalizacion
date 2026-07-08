import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@core/api';
import { toast } from '@shared/ui';
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
      await http.patch(`/campanas/${campanaId}/negocios/${encodeURIComponent(negocioId)}`, updates);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: campanasKeys.detail(campanaId) }),
    onError: (e) => toast.error(e.message || 'Error al actualizar el negocio'),
  });
}
