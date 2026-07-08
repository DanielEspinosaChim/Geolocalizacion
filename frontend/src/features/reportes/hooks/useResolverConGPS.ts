import { haversineM, obtenerGPS } from '@shared/lib/geo';
import { useActualizarReporte } from '../api/useReportes';
import { siguienteStatus, type Reporte } from '../model/reporte';

type Verificacion = Record<string, unknown> | 'cancelado';

/** Captura la posición del técnico y arma los campos verificado_* (o cancela). */
async function capturarVerificacion(lat: number, lng: number): Promise<Verificacion> {
  try {
    const pos = await obtenerGPS();
    const distancia = haversineM(lat, lng, pos.lat, pos.lng);
    const lejos =
      distancia > 300 &&
      !window.confirm(`Estás a ${distancia} m del reporte.\n¿Confirmas que estás en el lugar correcto?`);
    if (lejos) return 'cancelado';
    return {
      verificado_lat: pos.lat,
      verificado_lng: pos.lng,
      verificado_precision: pos.precision,
      verificado_distancia: distancia,
      verificado_fecha: new Date().toISOString(),
    };
  } catch (e) {
    const razon = e instanceof Error ? e.message : 'No se pudo obtener tu ubicación';
    const continuar = window.confirm(`${razon}.\n\n¿Marcar como resuelto sin verificar tu posición?`);
    return continuar ? {} : 'cancelado';
  }
}

/**
 * Avanza el status de un reporte. Al marcar "resuelto" captura la ubicación
 * del técnico y guarda la distancia de verificación (paridad con el legacy).
 */
export function useResolverConGPS() {
  const actualizar = useActualizarReporte();

  async function avanzar(reporte: Reporte) {
    const nuevo = siguienteStatus(reporte.status);
    if (!nuevo) return;

    let updates: Record<string, unknown> = { status: nuevo };
    if (nuevo === 'resuelto' && reporte.lat != null && reporte.lng != null) {
      const verificacion = await capturarVerificacion(reporte.lat, reporte.lng);
      if (verificacion === 'cancelado') return;
      updates = { ...updates, ...verificacion };
    }
    actualizar.mutate({ id: reporte.id, updates });
  }

  return { avanzar, isPending: actualizar.isPending };
}
