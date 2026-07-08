import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, http } from '@core/api';
import { toast } from '@shared/ui';
import type { Candidato, Tipo } from '../model/candidato';
import { candidatosKeys } from './useCandidatos';

interface GuardarTipoInput {
  placeId: string;
  tipo: Tipo;
}

/** Cambia el estado de formalización con optimistic update + rollback. */
export function useGuardarTipo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ placeId, tipo }: GuardarTipoInput) => {
      const { data } = await http.patch<{ ok?: boolean }>(
        `/candidatos/${encodeURIComponent(placeId)}/tipo`,
        { tipo },
      );
      if (!data.ok) throw new ApiError(undefined, 'El servidor rechazó el cambio');
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
    onSuccess: () => toast.success('Tipo actualizado'),
  });
}
