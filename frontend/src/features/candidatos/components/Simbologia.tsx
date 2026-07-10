import { LeyendaCapas, type CapaId } from '@features/colonias-zonas';
import { TIPO_LABELS, TIPOS } from '../model/candidato';
import { PuntoTipo } from './PuntoTipo';

/**
 * Leyenda del mapa de candidatos: los colores de los marcadores, más la escala
 * de probabilidad que `LeyendaCapas` añade sola cuando esa capa está activa.
 */
export function Simbologia({ capas }: { capas: ReadonlySet<CapaId> }) {
  return (
    <LeyendaCapas activas={capas}>
      <span className="font-bold uppercase tracking-wider text-fg-subtle">Simbología</span>
      {TIPOS.map((t) => (
        <span key={t} className="flex items-center gap-2">
          <PuntoTipo tipo={t} />
          {TIPO_LABELS[t]}
        </span>
      ))}
    </LeyendaCapas>
  );
}
