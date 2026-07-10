import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { toast } from '@shared/ui';

/**
 * Asigna un técnico a una campaña, o la desasigna con `uid=null`.
 *
 * Rutas del backend (bajo `/admin`): PATCH `.../asignar` con `{ uid }` para
 * asignar, DELETE `.../asignar` para quitar. Antes se pegaba a `/campanas/...`
 * sin el prefijo y con `{ asignado_a }`, que el backend no reconocía.
 */
export function useAsignarCampana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ campanaId, uid }: { campanaId: string; uid: string | null }) => {
      const base = `/admin/campanas/${campanaId}/asignar`;
      if (uid) await apiClient.patch(base, { uid });
      else await apiClient.delete(base);
    },
    onSuccess: (_data, { uid }) => {
      toast.success(uid ? 'Campaña asignada' : 'Asignación removida');
      void queryClient.invalidateQueries({ queryKey: ['campanas'] });
    },
    meta: { errorMessage: 'No se pudo asignar' },
  });
}
