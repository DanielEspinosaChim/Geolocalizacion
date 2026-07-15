import type { CacheStatus } from '../model/metricas';

interface EstadoCargaChipProps {
  cargados: number;
  estado: CacheStatus | undefined;
}

/**
 * Chip de progreso sobre el mapa (reemplaza el badge del header legacy).
 * No se posiciona solo: MapaCandidatos lo apila abajo-derecha con la leyenda.
 */
export function EstadoCargaChip({ cargados, estado }: EstadoCargaChipProps) {
  const listo = estado?.ready ?? false;
  const enServidor = estado?.count ?? 0;
  const texto = listo
    ? `${cargados.toLocaleString('es-MX')} candidatos`
    : `${cargados.toLocaleString('es-MX')}${enServidor > cargados ? ` de ${enServidor.toLocaleString('es-MX')}` : ''} cargando…`;

  return (
    /* Píldora blanca con punto de estado (lenguaje de chips de Google Maps):
       el color señala, el texto se lee en el color del tema. */
    <div
      className="flex items-center gap-1.5 rounded-control bg-surface px-3 py-1 text-xs2 font-bold text-fg-muted shadow-glass"
      role="status"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${listo ? 'bg-success' : 'animate-pulse bg-warning'}`}
      />
      {texto}
    </div>
  );
}
