import { Button } from '@shared/ui';
import { CAMPO_TIPO_LABELS, CAMPO_TIPOS, type Campo } from '../model/plantilla';

interface CampoEditorProps {
  campo: Campo;
  esPrimero: boolean;
  esUltimo: boolean;
  onChange: (patch: Partial<Campo>) => void;
  onMover: (dir: -1 | 1) => void;
  onQuitar: () => void;
}

export function CampoEditor({ campo, esPrimero, esUltimo, onChange, onMover, onQuitar }: CampoEditorProps) {
  return (
    <div className="grid gap-2 rounded-card border border-border bg-surface-raised p-3">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col">
          <button type="button" disabled={esPrimero} onClick={() => onMover(-1)} aria-label="Subir campo" className="text-fg-muted disabled:opacity-30">
            ▲
          </button>
          <button type="button" disabled={esUltimo} onClick={() => onMover(1)} aria-label="Bajar campo" className="text-fg-muted disabled:opacity-30">
            ▼
          </button>
        </div>
        <input
          value={campo.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Nombre del campo…"
          aria-label="Nombre del campo"
          className="flex-1 rounded-control border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button variant="ghost" onClick={onQuitar} className="px-2 text-danger" aria-label="Quitar campo">
          ✕
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CAMPO_TIPOS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={campo.tipo === t}
            onClick={() => onChange({ tipo: t, ...(t !== 'opciones' ? { opciones: null } : {}) })}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${
              campo.tipo === t ? 'bg-primary-strong text-primary-fg' : 'border border-border text-fg-muted'
            }`}
          >
            {CAMPO_TIPO_LABELS[t]}
          </button>
        ))}
      </div>
      {campo.tipo === 'opciones' ? (
        <input
          value={(campo.opciones ?? []).join(', ')}
          onChange={(e) =>
            onChange({ opciones: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })
          }
          placeholder="Opción A, Opción B, Opción C…"
          aria-label="Opciones separadas por coma"
          className="rounded-control border border-border bg-bg px-3 py-2 text-xs outline-none focus:border-primary"
        />
      ) : null}
    </div>
  );
}
