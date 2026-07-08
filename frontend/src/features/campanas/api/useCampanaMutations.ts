import { useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@core/api';
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
    mutationFn: async (body: NuevaCampana) => {
      const { data } = await http.post<{ id: string }>('/campanas', body);
      return data;
    },
    onSuccess: () => {
      toast.success('Campaña creada');
      void refetchAll();
    },
    onError: (e) => toast.error(e.message || 'Error al crear la campaña'),
  });

  const cambiarStatus = useMutation({
    mutationFn: async (status: 'cerrada' | 'cancelada' | 'activa') => {
      await http.patch(`/campanas/${campanaId}/status`, { status });
    },
    onSuccess: refetchAll,
    onError: (e) => toast.error(e.message || 'Error al cambiar el estado'),
  });

  const eliminar = useMutation({
    mutationFn: async () => {
      await http.delete(`/campanas/${campanaId}`);
    },
    onSuccess: () => {
      toast.success('Campaña eliminada');
      void refetchAll();
    },
    onError: (e) => toast.error(e.message || 'Error al eliminar'),
  });

  const agregarNegocio = useMutation({
    mutationFn: async (placeId: string) => {
      const { data } = await http.post<{ insertados: number }>(
        `/campanas/${campanaId}/negocios`,
        { negocio_ids: [placeId] },
      );
      return data;
    },
    onSuccess: refetchAll,
    onError: (e) => toast.error(e.message || 'Error al agregar el negocio'),
  });

  return { crear, cambiarStatus, eliminar, agregarNegocio };
}
