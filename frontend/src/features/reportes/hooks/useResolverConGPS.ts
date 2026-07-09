import { useConfirm, type ConfirmOptions } from '@shared/ui';
import { haversineM, obtenerGPS } from '@shared/lib/geo';
import { useActualizarReporte } from '../api/useReportes';
import { siguienteStatus, type Reporte } from '../model/reporte';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type Verificacion = Record<string, unknown> | 'cancelado';

/** Captura la posición del técnico y arma los campos verificado_* (o cancela). */
async function capturarVerificacion(
  lat: number,
  lng: number,
  confirm: ConfirmFn,
): Promise<Verificacion> {
  try {
    const pos = await obtenerGPS();
    const distancia = haversineM(lat, lng, pos.lat, pos.lng);
    if (distancia > 300) {
      const ok = await confirm({
        title: 'Estás lejos del reporte',
        description: `Estás a ${distancia} m del reporte. ¿Confirmas que estás en el lugar correcto?`,
        confirmLabel: 'Sí, estoy aquí',
      });
      if (!ok) return 'cancelado';
    }
    return {
      verificado_lat: pos.lat,
      verificado_lng: pos.lng,
      verificado_precision: pos.precision,
      verificado_distancia: distancia,
      verificado_fecha: new Date().toISOString(),
    };
  } catch (e) {
    const razon = e instanceof Error ? e.message : 'No se pudo obtener tu ubicación';
    const continuar = await confirm({
      title: 'Sin ubicación',
      description: `${razon}. ¿Marcar como resuelto sin verificar tu posición?`,
      confirmLabel: 'Marcar sin verificar',
      tone: 'danger',
    });
    return continuar ? {} : 'cancelado';
  }
}

/**
 * Avanza el status de un reporte. Al marcar "resuelto" captura la ubicación
 * del técnico y guarda la distancia de verificación (paridad con el legacy).
 */
export function useResolverConGPS() {
  const actualizar = useActualizarReporte();
  const confirm = useConfirm();

  async function avanzar(reporte: Reporte) {
    const nuevo = siguienteStatus(reporte.status);
    if (!nuevo) return;

    let updates: Record<string, unknown> = { status: nuevo };
    if (nuevo === 'resuelto' && reporte.lat != null && reporte.lng != null) {
      const verificacion = await capturarVerificacion(reporte.lat, reporte.lng, confirm);
      if (verificacion === 'cancelado') return;
      updates = { ...updates, ...verificacion };
    }
    actualizar.mutate({ id: reporte.id, updates });
  }

  return { avanzar, isPending: actualizar.isPending };
}
