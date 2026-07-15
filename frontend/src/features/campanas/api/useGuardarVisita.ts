import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, reverseGeocode } from '@shared/api';
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
  fotoLocal: File | null;
  fotoNegocio: File | null;
  fotoLocalBorrada: boolean;
  fotoNegocioBorrada: boolean;
}

/**
 * Guarda una visita: sube datos + fotos (multipart), fuerza completado/notas por
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
      if (input.fotoLocal) fd.append('foto_local', input.fotoLocal);
      if (input.fotoNegocio) fd.append('foto_negocio', input.fotoNegocio);
      await apiClient.postForm(`${base}/visita`, fd);

      const patch: Record<string, unknown> = { completado: input.visitado, notas: input.notas };
      // Borrar una foto = enviar cadena vacía, solo si no se subió una nueva.
      if (input.fotoLocalBorrada && !input.fotoLocal) patch.foto_local_url = '';
      if (input.fotoNegocioBorrada && !input.fotoNegocio) patch.foto_negocio_url = '';
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
    // Dirección legible del punto de la visita (paridad con el legacy).
    // reverseGeocode nunca lanza: si Nominatim falla devuelve "lat, lng".
    gps.visita_direccion = await reverseGeocode(pos.lat, pos.lng);
    await apiClient.patch(base, gps);
    onDone();
  } catch {
    /* GPS denegado o no disponible — la visita ya se guardó igual */
  }
}
