import { Spinner } from '@shared/ui';
import { ColoniaSelect } from '@features/colonias-zonas';
import type { Candidato } from '../model/candidato';
import type { Filtros } from '../model/filtros';
import { CandidatosList } from './CandidatosList';
import { FiltrosBar } from './FiltrosBar';
import { MetricasPanel } from './MetricasPanel';

interface PanelLateralProps {
  visible: boolean;
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  filtrados: Candidato[];
  isPending: boolean;
  seleccionadoId: string | null;
  onSelect: (c: Candidato) => void;
}

/** Sidebar del mapa: búsqueda, filtros, métricas y lista. */
export function PanelLateral({
  visible,
  filtros,
  onFiltros,
  filtrados,
  isPending,
  seleccionadoId,
  onSelect,
}: PanelLateralProps) {
  return (
    <aside
      className={`w-full flex-col border-r border-border bg-surface md:flex md:w-96 ${
        visible ? 'flex' : 'hidden'
      }`}
    >
      <FiltrosBar filtros={filtros} onChange={onFiltros} />
      <div className="border-b border-border p-3">
        <ColoniaSelect
          value={filtros.colonia}
          onChange={(colonia) => onFiltros({ ...filtros, colonia })}
        />
      </div>
      <MetricasPanel data={filtrados} />
      {isPending ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner label="Cargando candidatos…" />
        </div>
      ) : (
        <CandidatosList data={filtrados} selectedId={seleccionadoId} onSelect={onSelect} />
      )}
    </aside>
  );
}
