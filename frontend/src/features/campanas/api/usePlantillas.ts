import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { toast } from '@shared/ui';
import { plantillaListSchema, type Campo } from '../model/plantilla';
import { campanasKeys } from './keys';

export function usePlantillas() {
  return useQuery({
    queryKey: campanasKeys.plantillas,
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/plantillas', { signal });
      return plantillaListSchema.parse(data);
    },
    staleTime: 60_000,
  });
}

export interface PlantillaInput {
  nombre: string;
  descripcion: string;
  campos: Campo[];
}

export function usePlantillaMutations() {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: campanasKeys.plantillas });

  const guardar = useMutation({
    mutationFn: async ({ id, body }: { id: string | null; body: PlantillaInput }) => {
      if (id) await apiClient.put(`/plantillas/${id}`, body);
      else await apiClient.post('/plantillas', body);
    },
    onSuccess: () => {
      toast.success('Plantilla guardada');
      void invalidar();
    },
    meta: { errorMessage: 'Error al guardar la plantilla' },
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/plantillas/${id}`);
    },
    onSuccess: () => {
      toast.success('Plantilla eliminada');
      void invalidar();
    },
    meta: { errorMessage: 'Error al eliminar la plantilla' },
  });

  return { guardar, eliminar };
}
