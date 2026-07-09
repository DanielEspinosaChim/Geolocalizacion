import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { campanaListSchema, type StatusCampana } from '../model/campana';
import { campanasKeys } from './keys';

interface Opciones {
  status: StatusCampana | null;
  /** uid del técnico: filtra a solo sus campañas asignadas (modo técnico). */
  asignadoA?: string | null;
}

export function useCampanas({ status, asignadoA }: Opciones) {
  return useQuery({
    queryKey: campanasKeys.list(status),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/campanas', {
        signal,
        params: status ? { status } : undefined,
      });
      return campanaListSchema.parse(data);
    },
    staleTime: 15_000,
    select: (campanas) =>
      asignadoA ? campanas.filter((c) => c.asignado_a === asignadoA) : campanas,
  });
}
