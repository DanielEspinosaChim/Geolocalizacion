import { SelectField, TextField } from '@shared/ui';
import type { Campo, ValorCampo } from '../model/plantilla';

interface CampoVisitaProps {
  campo: Campo;
  valor: ValorCampo | undefined;
  onChange: (valor: ValorCampo) => void;
}

/** Renderiza el input adecuado según el tipo de campo de la plantilla. */
export function CampoVisita({ campo, valor, onChange }: CampoVisitaProps) {
  const label = `${campo.label}${campo.requerido ? ' *' : ''}`;

  switch (campo.tipo) {
    case 'opciones':
      return (
        <SelectField label={label} value={String(valor ?? '')} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Seleccionar —</option>
          {(campo.opciones ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </SelectField>
      );
    case 'bool':
      return <BoolField label={label} valor={valor === true} onChange={onChange} />;
    case 'numero':
      return (
        <TextField
          label={label}
          type="number"
          min={0}
          value={valor === undefined ? '' : String(valor)}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      );
    case 'textarea':
      return (
        <label className="grid gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{label}</span>
          <textarea
            value={String(valor ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className="h-20 resize-y rounded-control border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      );
    default:
      return <TextField label={label} value={String(valor ?? '')} onChange={(e) => onChange(e.target.value)} />;
  }
}

function BoolField({ label, valor, onChange }: { label: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{label}</span>
      <div className="flex gap-1.5">
        {[
          { v: true, txt: '✓ Sí', on: 'border-success bg-success/15 text-success' },
          { v: false, txt: '✗ No', on: 'border-danger bg-danger/15 text-danger' },
        ].map(({ v, txt, on }) => (
          <button
            key={String(v)}
            type="button"
            aria-pressed={valor === v}
            onClick={() => onChange(v)}
            className={`flex-1 rounded-control border py-2 text-sm font-semibold transition-colors ${
              valor === v ? on : 'border-border text-fg-muted'
            }`}
          >
            {txt}
          </button>
        ))}
      </div>
    </div>
  );
}
