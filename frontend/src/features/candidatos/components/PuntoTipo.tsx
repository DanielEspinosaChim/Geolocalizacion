import { TIPO_COLORS, type Tipo } from '../model/candidato';

/**
 * Punto del color del marcador en el mapa. Lo comparten el filtro por estado y
 * el selector de formalización: `TIPO_COLORS` es la única fuente, así que no
 * pueden desincronizarse con los pines.
 */
export function PuntoTipo({ tipo }: { tipo: Tipo }) {
  return (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-black/20"
      style={{ backgroundColor: TIPO_COLORS[tipo] }}
    />
  );
}
