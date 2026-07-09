import type { CacheStatus } from '../model/metricas';

interface EstadoCargaChipProps {
  cargados: number;
  estado: CacheStatus | undefined;
}

/**
 * Chip de progreso sobre el mapa (reemplaza el badge del header legacy).
 * Va abajo a la derecha: arriba a la derecha están los toggles de capas.
 */
export function EstadoCargaChip({ cargados, estado }: EstadoCargaChipProps) {
  const listo = estado?.ready ?? false;
  const enServidor = estado?.count ?? 0;
  const texto = listo
    ? `${cargados.toLocaleString('es-MX')} candidatos`
    : `${cargados.toLocaleString('es-MX')}${enServidor > cargados ? ` de ${enServidor.toLocaleString('es-MX')}` : ''} cargando…`;

  return (
    <div
      className={`absolute bottom-4 right-3 z-panel rounded-full px-3 py-1 text-xs2 font-bold text-white shadow-overlay ${
        listo ? 'bg-success' : 'bg-warning'
      }`}
      role="status"
    >
      {texto}
    </div>
  );
}
