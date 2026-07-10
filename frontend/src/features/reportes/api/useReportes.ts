import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { toast } from '@shared/ui';
import {
  reporteListSchema,
  reporteSchema,
  type StatusReporte,
  type TipoReporte,
} from '../model/reporte';

export const reportesKeys = {
  all: ['reportes'] as const,
  list: (status: StatusReporte | null) => ['reportes', 'list', status ?? 'todos'] as const,
};

export function useReportes(status: StatusReporte | null) {
  return useQuery({
    queryKey: reportesKeys.list(status),
    queryFn: async ({ signal }) => {
      const data = await apiClient.get<unknown>('/reportes', {
        signal,
        params: { limit: 200, ...(status ? { status } : {}) },
      });
      return reporteListSchema.parse(data);
    },
    staleTime: 30_000,
  });
}

export interface NuevoReporte {
  tipo: TipoReporte;
  lat: number;
  lng: number;
  descripcion: string;
  direccion: string;
  foto: File | null;
}

/** Devuelve el reporte creado: la vista lo muestra sin volver a pedir la lista. */
export function useCrearReporte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (r: NuevoReporte) => {
      const fd = new FormData();
      fd.append('tipo', r.tipo);
      fd.append('lat', String(r.lat));
      fd.append('lng', String(r.lng));
      fd.append('descripcion', r.descripcion);
      fd.append('direccion', r.direccion);
      if (r.foto) fd.append('foto', r.foto);
      const data = await apiClient.postForm<unknown>('/reportes', fd);
      return reporteSchema.parse(data);
    },
    onSuccess: () => {
      toast.success('Reporte enviado');
      void queryClient.invalidateQueries({ queryKey: reportesKeys.all });
    },
    meta: { errorMessage: 'Error al enviar el reporte' },
  });
}

/** PATCH genérico (cambio de status + campos de verificación GPS). */
export function useActualizarReporte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      await apiClient.patch(`/reportes/${encodeURIComponent(id)}`, updates);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: reportesKeys.all }),
    meta: { errorMessage: 'Error al actualizar' },
  });
}

export function useEliminarReporte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/reportes/${encodeURIComponent(id)}`);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: reportesKeys.all }),
    meta: { errorMessage: 'Error al eliminar' },
  });
}
