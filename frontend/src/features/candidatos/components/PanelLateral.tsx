import { useMemo } from 'react';
import { formatNumero } from '@shared/lib/format';
import { PanelSection, SearchInput, Spinner } from '@shared/ui';
import { ColoniaSelect } from '@features/colonias-zonas';
import type { Candidato } from '../model/candidato';
import { calcularMetricas, type Filtros } from '../model/filtros';
import { CandidatosList } from './CandidatosList';
import { FiltroEstado } from './FiltroEstado';
import { MetricasPanel, TiposNegocio } from './MetricasPanel';

interface PanelLateralProps {
  visible: boolean;
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  filtrados: Candidato[];
  isPending: boolean;
  seleccionadoId: string | null;
  onSelect: (c: Candidato) => void;
}

/**
 * Sidebar del mapa. Las secciones se pliegan porque son cinco y el panel se
 * satura; "Tipos de negocio" arranca cerrada por ser informativa, no un control.
 */
export function PanelLateral({
  visible,
  filtros,
  onFiltros,
  filtrados,
  isPending,
  seleccionadoId,
  onSelect,
}: PanelLateralProps) {
  // Una sola pasada sobre los candidatos filtrados; la comparten ambas secciones.
  const metricas = useMemo(() => calcularMetricas(filtrados), [filtrados]);

  return (
    <aside
      className={`scrollbar-slim w-full flex-col overflow-y-auto border-r border-border bg-surface md:flex md:w-96 ${
        visible ? 'flex' : 'hidden'
      }`}
    >
      <PanelSection
        title="Candidatos"
        collapsible
        action={
          <span className="text-2xs tabular-nums text-fg-subtle">
            {formatNumero(metricas.total)}
          </span>
        }
      >
        <MetricasPanel metricas={metricas} />
      </PanelSection>

      <PanelSection title="Tipos de negocio" collapsible defaultOpen={false}>
        <TiposNegocio metricas={metricas} />
      </PanelSection>

      <PanelSection title="Filtrar por colonia" collapsible>
        <ColoniaSelect
          label=""
          value={filtros.colonia}
          onChange={(colonia) => onFiltros({ ...filtros, colonia })}
        />
      </PanelSection>

      <PanelSection title="Filtrar por estado" collapsible>
        <FiltroEstado valor={filtros.tipo} onChange={(tipo) => onFiltros({ ...filtros, tipo })} />
      </PanelSection>

      <PanelSection title="Buscar negocio" collapsible>
        <SearchInput
          value={filtros.q}
          onChange={(q) => onFiltros({ ...filtros, q })}
          debounceMs={200}
          placeholder="Nombre del negocio…"
          aria-label="Buscar negocio por nombre"
        />
      </PanelSection>

      {isPending ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <Spinner label="Cargando candidatos…" />
        </div>
      ) : (
        <CandidatosList data={filtrados} selectedId={seleccionadoId} onSelect={onSelect} />
      )}
    </aside>
  );
}
