import { useMemo } from 'react';
import { Combobox, type ComboboxOption } from '@shared/ui';
import { useColonias } from '../api/useColonias';

interface ColoniaSelectProps {
  value: string | null;
  onChange: (colonia: string | null) => void;
  /** Vacío = sin rótulo visible, cuando el contexto ya nombra el campo. */
  label?: string;
}

/**
 * Selector de colonia con filtro por texto. Son más de 700 y el `<select>`
 * nativo obligaba a recorrerlas a mano.
 */
export function ColoniaSelect({ value, onChange, label = 'Colonia' }: ColoniaSelectProps) {
  const { data: colonias = [] } = useColonias();

  const opciones = useMemo<ComboboxOption[]>(
    () => colonias.map((c) => ({ value: c.id, label: c.nombre, hint: String(c.count) })),
    [colonias],
  );

  return (
    <Combobox
      options={opciones}
      value={value}
      onChange={onChange}
      label={label}
      aria-label={label ? undefined : 'Filtrar por colonia'}
      placeholder="Todas las colonias"
    />
  );
}
