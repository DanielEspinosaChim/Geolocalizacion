import { useMemo } from 'react';
import { formatNumero } from '@shared/lib/format';
import { APP_NAME, VERSION_LABEL } from '@shared/lib/version';
import { PanelSection, Spinner } from '@shared/ui';
import { ColoniaSelect } from '@features/colonias-zonas';
import type { Candidato } from '../model/candidato';
import { calcularMetricas, type Filtros } from '../model/filtros';
import { CandidatosList } from './CandidatosList';
import { FiltroEstado } from './FiltroEstado';
import { MetricasPanel, TiposNegocio } from './MetricasPanel';

interface PanelLateralProps {
  filtros: Filtros;
  onFiltros: (f: Filtros) => void;
  filtrados: Candidato[];
  isPending: boolean;
  seleccionadoId: string | null;
  onSelect: (c: Candidato) => void;
}

/**
 * Sidebar del mapa en escritorio. En móvil el MISMO contenido
 * (PanelLateralContenido) vive dentro del BottomSheet de CandidatosPage.
 */
export function PanelLateral(props: PanelLateralProps) {
  return (
    <aside className="scrollbar-slim flex w-full flex-col overflow-y-auto border-r border-border bg-surface max-md:hidden md:w-96">
      <PanelLateralContenido {...props} />
    </aside>
  );
}

/**
 * Secciones del panel. Se pliegan porque son cinco y el panel se satura;
 * "Tipos de negocio" arranca cerrada por ser informativa, no un control.
 */
export function PanelLateralContenido({
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
    <>
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

      {/* La búsqueda por nombre vive en el buscador flotante sobre el mapa
          (BuscadorNegocios); esta sección lista los resultados de los filtros.
          Sin `grow`: el panel es el único contenedor con scroll y el título no
          se va con él. */}
      <PanelSection
        title="Negocios"
        collapsible
        action={
          isPending ? null : (
            <span className="text-2xs tabular-nums text-fg-subtle">
              {formatNumero(filtrados.length)}
            </span>
          )
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

      {/* Pie del sidebar: versión visible sin estorbar (mt-auto lo ancla abajo). */}
      <footer className="mt-auto border-t border-border px-3 py-2 text-center text-2xs font-medium text-fg-subtle">
        {APP_NAME} {VERSION_LABEL}
      </footer>
    </>
  );
}
