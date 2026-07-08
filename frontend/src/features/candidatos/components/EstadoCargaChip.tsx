import type { CacheStatus } from '../api/useCargaProgresiva';

interface EstadoCargaChipProps {
  cargados: number;
  estado: CacheStatus | undefined;
}

/** Chip de progreso sobre el mapa (reemplaza el badge del header legacy). */
export function EstadoCargaChip({ cargados, estado }: EstadoCargaChipProps) {
  const listo = estado?.ready ?? false;
  const enServidor = estado?.count ?? 0;
  const texto = listo
    ? `${cargados.toLocaleString('es-MX')} candidatos`
    : `${cargados.toLocaleString('es-MX')}${enServidor > cargados ? ` de ${enServidor.toLocaleString('es-MX')}` : ''} cargando…`;

  return (
    <div
      className={`absolute right-3 top-3 z-[1000] rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-lg ${
        listo ? 'bg-success' : 'bg-warning'
      }`}
      role="status"
    >
      {texto}
    </div>
  );
}
