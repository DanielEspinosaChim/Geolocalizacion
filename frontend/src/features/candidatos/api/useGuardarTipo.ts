import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@core/api';
import { apiClient } from '@shared/api';
import { toast } from '@shared/ui';
import type { Candidato, Tipo } from '../model/candidato';
import { candidatosKeys } from './useCandidatos';

interface GuardarTipoInput {
  placeId: string;
  tipo: Tipo;
}

interface GuardarTipoResponse {
  ok: boolean;
  place_id: string;
  tipo: string;
  fecha_actualizacion: string;
}

/** Cambia el estado de formalización con optimistic update + rollback. */
export function useGuardarTipo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ placeId, tipo }: GuardarTipoInput) => {
      const data = await apiClient.patch<GuardarTipoResponse>(
        `/candidatos/${encodeURIComponent(placeId)}/tipo`,
        { tipo },
      );
      if (!data.ok) throw new ApiError(undefined, 'El servidor rechazó el cambio');
      return data;
    },
    onMutate: async ({ placeId, tipo }) => {
      await queryClient.cancelQueries({ queryKey: candidatosKeys.all });
      const previo = queryClient.getQueryData<Candidato[]>(candidatosKeys.all);
      queryClient.setQueryData<Candidato[]>(candidatosKeys.all, (old) =>
        old?.map((c) => (c.place_id === placeId ? { ...c, tipo } : c)),
      );
      return { previo };
    },
    onError: (_error, _input, contexto) => {
      if (contexto?.previo) queryClient.setQueryData(candidatosKeys.all, contexto.previo);
      toast.error('Error al guardar. Intenta de nuevo.');
    },
    onSuccess: (data) => {
      // Actualizar fecha_actualizacion con la respuesta real del servidor
      queryClient.setQueryData<Candidato[]>(candidatosKeys.all, (old) =>
        old?.map((c) =>
          c.place_id === data.place_id
            ? { ...c, tipo: data.tipo as Tipo, fecha_actualizacion: data.fecha_actualizacion }
            : c,
        ),
      );
      toast.success('Tipo actualizado');
    },
    // Invalidar métricas porque el conteo de formales/informales cambió
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: candidatosKeys.metricas });
    },
  });
}

