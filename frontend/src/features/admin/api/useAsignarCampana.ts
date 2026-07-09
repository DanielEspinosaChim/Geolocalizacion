import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { toast } from '@shared/ui';

/** Asigna (o desasigna con uid=null) un técnico a una campaña. */
export function useAsignarCampana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ campanaId, uid }: { campanaId: string; uid: string | null }) => {
      await apiClient.patch(`/campanas/${campanaId}/asignar`, { asignado_a: uid });
    },
    onSuccess: (_data, { uid }) => {
      toast.success(uid ? 'Campaña asignada' : 'Asignación removida');
      void queryClient.invalidateQueries({ queryKey: ['campanas'] });
    },
    meta: { errorMessage: 'No se pudo asignar' },
  });
}
