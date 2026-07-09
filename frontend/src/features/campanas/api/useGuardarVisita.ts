import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@shared/api';
import { haversineM, obtenerGPS } from '@shared/lib/geo';
import { toast } from '@shared/ui';
import type { NegocioCampana } from '../model/campana';
import type { DatosVisita } from '../model/plantilla';
import { campanasKeys } from './keys';

export interface GuardarVisitaInput {
  negocio: NegocioCampana;
  datos: DatosVisita;
  plantillaId: string;
  visitado: boolean;
  notas: string;
  foto: File | null;
  fotoBorrada: boolean;
}

/**
 * Guarda una visita: sube datos+foto (multipart), fuerza completado/notas por
 * PATCH y captura la ubicación GPS en segundo plano (paridad con el legacy).
 */
export function useGuardarVisita(campanaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GuardarVisitaInput) => {
      const base = `/campanas/${campanaId}/negocios/${encodeURIComponent(input.negocio.negocio_id)}`;
      const fd = new FormData();
      fd.append('datos_json', JSON.stringify(input.datos));
      fd.append('plantilla_id', input.plantillaId);
      fd.append('completado', String(input.visitado));
      if (input.foto) fd.append('foto', input.foto);
      await apiClient.postForm(`${base}/visita`, fd);

      const patch: Record<string, unknown> = { completado: input.visitado, notas: input.notas };
      if (input.fotoBorrada && !input.foto) patch.foto_visita_url = '';
      await apiClient.patch(base, patch);
      return { base, negocio: input.negocio };
    },
    onSuccess: ({ base, negocio }) => {
      toast.success('Visita guardada');
      void queryClient.invalidateQueries({ queryKey: campanasKeys.detail(campanaId) });
      void capturarGPS(base, negocio, () => {
        void queryClient.invalidateQueries({ queryKey: campanasKeys.detail(campanaId) });
      });
    },
    meta: { errorMessage: 'Error al guardar la visita' },
  });
}

/** GPS en segundo plano: no bloquea el cierre del modal. Silencioso si falla. */
async function capturarGPS(base: string, negocio: NegocioCampana, onDone: () => void) {
  try {
    const pos = await obtenerGPS();
    const gps: Record<string, unknown> = {
      visita_lat: pos.lat,
      visita_lng: pos.lng,
      visita_precision: pos.precision,
    };
    if (negocio.lat != null && negocio.lng != null) {
      const dist = haversineM(negocio.lat, negocio.lng, pos.lat, pos.lng);
      if (dist < 10_000) gps.visita_distancia = dist;
    }
    await apiClient.patch(base, gps);
    onDone();
  } catch {
    /* GPS denegado o no disponible — la visita ya se guardó igual */
  }
}
