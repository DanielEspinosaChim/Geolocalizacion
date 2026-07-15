import { BarChart3, Flame, Home, Map, type LucideIcon } from 'lucide-react';

export type CapaId = 'probabilidad' | 'colonias' | 'municipios' | 'agebs';

const CAPAS: { id: CapaId; label: string; Icon: LucideIcon }[] = [
  { id: 'probabilidad', label: 'Probabilidad', Icon: Flame },
  { id: 'colonias', label: 'Colonias', Icon: Home },
  { id: 'municipios', label: 'Municipios', Icon: Map },
  { id: 'agebs', label: 'AGEBs', Icon: BarChart3 },
];

interface CapasTogglesProps {
  activas: ReadonlySet<CapaId>;
  onToggle: (capa: CapaId) => void;
  /**
   * `column` (por defecto): pila vertical a la derecha del mapa (escritorio).
   * `row`: tira horizontal de chips (móvil), para no tapar el buscador ni el
   * globo de detalle.
   */
  orientation?: 'column' | 'row';
}

/** Botones para prender/apagar capas geográficas (probabilidad, colonias…). */
export function CapasToggles({ activas, onToggle, orientation = 'column' }: CapasTogglesProps) {
  const fila = orientation === 'row';
  return (
    <div
      role="group"
      aria-label="Capas del mapa"
      className={
        fila
          ? 'scrollbar-none flex items-center gap-1.5 overflow-x-auto'
          : 'flex flex-col items-end gap-1.5'
      }
    >
      {CAPAS.map(({ id, label, Icon }) => {
        const activa = activas.has(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={activa}
            aria-label={label}
            title={label}
            onClick={() => onToggle(id)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border px-3 py-1.5 text-xs2 font-bold shadow-overlay transition-colors ${
              activa
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-surface text-fg-muted hover:text-fg'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
