import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, Chip, IconButton } from '@shared/ui';
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
    <Card raised className="grid gap-2 p-3">
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col">
          <IconButton size="sm" icon={ChevronUp} label="Subir campo" disabled={esPrimero} onClick={() => onMover(-1)} className="h-5" />
          <IconButton size="sm" icon={ChevronDown} label="Bajar campo" disabled={esUltimo} onClick={() => onMover(1)} className="h-5" />
        </div>
        <input
          value={campo.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Nombre del campo…"
          aria-label="Nombre del campo"
          className="flex-1 rounded-control border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <IconButton variant="danger" size="sm" icon={X} label="Quitar campo" onClick={onQuitar} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CAMPO_TIPOS.map((t) => (
          <Chip
            key={t}
            tone="primary"
            active={campo.tipo === t}
            onClick={() => onChange({ tipo: t, ...(t !== 'opciones' ? { opciones: null } : {}) })}
          >
            {CAMPO_TIPO_LABELS[t]}
          </Chip>
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
    </Card>
  );
}
