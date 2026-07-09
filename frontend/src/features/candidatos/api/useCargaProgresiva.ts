import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@shared/api';
import type { Candidato } from '../model/candidato';
import { cacheStatusSchema, type CacheStatus } from '../model/metricas';
import { candidatosKeys } from './useCandidatos';


/**
 * Carga progresiva (reemplaza _watchCacheReady del legacy): sondea
 * /api/cache-status mientras el backend hidrata su cache de Firestore y
 * re-consulta candidatos cuando hay ≥200 docs nuevos o al quedar listo.
 */
export function useCargaProgresiva(): CacheStatus | undefined {
  const queryClient = useQueryClient();
  const { data: status } = useQuery({
    queryKey: candidatosKeys.cacheStatus,
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/cache-status', { signal });
      return cacheStatusSchema.parse(data);
    },
    refetchInterval: (query) => (query.state.data?.ready ? false : 1500),
    refetchOnWindowFocus: false,
  });

  const readyHandled = useRef(false);
  useEffect(() => {
    if (!status || readyHandled.current) return;
    const enCache = queryClient.getQueryData<Candidato[]>(candidatosKeys.all)?.length ?? 0;
    const debeRefrescar = status.ready
      ? status.count !== enCache
      : status.count >= enCache + 200;
    if (status.ready) readyHandled.current = true;
    if (debeRefrescar && status.count > 0) {
      void queryClient.invalidateQueries({ queryKey: candidatosKeys.all });
    }
  }, [status, queryClient]);

  return status;
}
