import { BarChart3, Home, Map, type LucideIcon } from 'lucide-react';

export type CapaId = 'colonias' | 'agebs' | 'municipios';

const CAPAS: { id: CapaId; label: string; Icon: LucideIcon }[] = [
  { id: 'colonias', label: 'Colonias', Icon: Home },
  { id: 'agebs', label: 'AGEBs', Icon: BarChart3 },
  { id: 'municipios', label: 'Municipios', Icon: Map },
];

interface CapasTogglesProps {
  activas: ReadonlySet<CapaId>;
  onToggle: (capa: CapaId) => void;
}

/** Botones para prender/apagar capas geográficas (overlay sobre el mapa). */
export function CapasToggles({ activas, onToggle }: CapasTogglesProps) {
  return (
    <div className="flex gap-1.5">
      {CAPAS.map(({ id, label, Icon }) => {
        const activa = activas.has(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={activa}
            onClick={() => onToggle(id)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs2 font-bold shadow-lg transition-colors ${
              activa
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-surface text-fg-muted hover:text-fg'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
          </button>
        );
      })}
    </div>
  );
}
