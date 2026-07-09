import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { toast } from '@shared/ui';
import { campanasKeys } from './keys';

export interface NuevaCampana {
  nombre: string;
  descripcion: string;
  colonia: string;
  fecha_inicio: string;
  fecha_fin: string;
}

/** Mutaciones de campaña que invalidan lista y/o detalle. */
export function useCampanaMutations(campanaId: string | null) {
  const queryClient = useQueryClient();
  const refetchAll = () => queryClient.invalidateQueries({ queryKey: campanasKeys.all });

  const crear = useMutation({
    mutationFn: (body: NuevaCampana) => apiClient.post<{ id: string }>('/campanas', body),
    onSuccess: () => {
      toast.success('Campaña creada');
      void refetchAll();
    },
    meta: { errorMessage: 'Error al crear la campaña' },
  });

  const cambiarStatus = useMutation({
    mutationFn: async (status: 'cerrada' | 'cancelada' | 'activa') => {
      await apiClient.patch(`/campanas/${campanaId}/status`, { status });
    },
    onSuccess: refetchAll,
    meta: { errorMessage: 'Error al cambiar el estado' },
  });

  const eliminar = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/campanas/${campanaId}`);
    },
    onSuccess: () => {
      toast.success('Campaña eliminada');
      void refetchAll();
    },
    meta: { errorMessage: 'Error al eliminar' },
  });

  const agregarNegocio = useMutation({
    mutationFn: (placeId: string) =>
      apiClient.post<{ insertados: number }>(`/campanas/${campanaId}/negocios`, {
        negocio_ids: [placeId],
      }),
    onSuccess: refetchAll,
    meta: { errorMessage: 'Error al agregar el negocio' },
  });

  return { crear, cambiarStatus, eliminar, agregarNegocio };
}
