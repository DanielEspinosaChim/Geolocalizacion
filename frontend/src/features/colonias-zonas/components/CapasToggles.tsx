export type CapaId = 'colonias' | 'agebs' | 'municipios';

const CAPAS: { id: CapaId; label: string }[] = [
  { id: 'colonias', label: '🏘️ Colonias' },
  { id: 'agebs', label: '📊 AGEBs' },
  { id: 'municipios', label: '🗺️ Municipios' },
];

interface CapasTogglesProps {
  activas: ReadonlySet<CapaId>;
  onToggle: (capa: CapaId) => void;
}

/** Botones para prender/apagar capas geográficas (overlay sobre el mapa). */
export function CapasToggles({ activas, onToggle }: CapasTogglesProps) {
  return (
    <div className="flex gap-1.5">
      {CAPAS.map(({ id, label }) => {
        const activa = activas.has(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={activa}
            onClick={() => onToggle(id)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-lg transition-colors ${
              activa
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-surface text-fg-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
