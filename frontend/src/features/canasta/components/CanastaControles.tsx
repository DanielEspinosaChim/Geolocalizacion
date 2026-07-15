import { Chip } from '@shared/ui';
import { mesLabel, type Mes, type VistaCanasta } from '../model/canasta';

const VISTAS: { id: VistaCanasta; label: string }[] = [
  { id: 'precios', label: 'Precios' },
  { id: 'variacion', label: 'Variación %' },
  { id: 'trimestres', label: 'Trimestres' },
];

/** Barra de controles: pills de modo de vista y chips de meses visibles. */
export function CanastaControles({
  vista,
  onVista,
  meses,
  mesesSel,
  onToggleMes,
}: {
  vista: VistaCanasta;
  onVista: (vista: VistaCanasta) => void;
  meses: Mes[];
  mesesSel: Set<Mes>;
  onToggleMes: (mes: Mes) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1.5" role="group" aria-label="Modo de vista">
        {VISTAS.map((v) => (
          <Chip key={v.id} tone="secondary" active={vista === v.id} onClick={() => onVista(v.id)}>
            {v.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Meses visibles">
        {meses.map((m) => (
          <Chip key={m} tone="secondary" active={mesesSel.has(m)} onClick={() => onToggleMes(m)}>
            {mesLabel(m)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
