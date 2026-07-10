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
      <PanelSection title="Candidatos" collapsible>
        <MetricasPanel metricas={metricas} />
      </PanelSection>

      <PanelSection title="Tipos de negocio" collapsible>
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

      {/* La lista vive dentro de esta sección: es el resultado de la búsqueda,
          así que plegar el buscador también esconde los negocios. Sin `grow`:
          el panel es el único contenedor con scroll y el título no se va con él. */}
      <PanelSection
        title="Buscar negocio"
        collapsible
        action={
          isPending ? null : (
            <span className="text-2xs tabular-nums text-fg-subtle">
              {formatNumero(filtrados.length)}
            </span>
          )
        }
        sticky={
          <SearchInput
            value={filtros.q}
            onChange={(q) => onFiltros({ ...filtros, q })}
            debounceMs={200}
            placeholder="Nombre del negocio…"
            aria-label="Buscar negocio por nombre"
          />
        }
      >
        {isPending ? (
          <div className="flex justify-center p-6">
            <Spinner label="Cargando candidatos…" />
          </div>
        ) : (
          /* -mx-3 sangra las filas hasta el borde del panel, como en Reportes. */
          <CandidatosList
            className="-mx-3 -mb-3"
            data={filtrados}
            selectedId={seleccionadoId}
            onSelect={onSelect}
          />
        )}
      </PanelSection>
    </aside>
  );
}
