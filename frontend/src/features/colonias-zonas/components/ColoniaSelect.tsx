import { SelectField } from '@shared/ui';
import { useColonias } from '../api/useColonias';

interface ColoniaSelectProps {
  value: string | null;
  onChange: (colonia: string | null) => void;
  label?: string;
}

/** Select de colonias con conteo de candidatos (reemplaza .select-colonia). */
export function ColoniaSelect({ value, onChange, label = 'Colonia' }: ColoniaSelectProps) {
  const { data: colonias = [] } = useColonias();
  return (
    <SelectField
      label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Todas las colonias</option>
      {colonias.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre} ({c.count})
        </option>
      ))}
    </SelectField>
  );
}
