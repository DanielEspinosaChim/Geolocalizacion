import type { ReactNode } from 'react';
import { formatNumero } from '@shared/lib/format';
import {
  Badge,
  DataTable,
  EmptyState,
  Page,
  PageHeader,
  QueryBoundary,
  Spinner,
  type Column,
} from '@shared/ui';
import { giroLabel } from '@features/candidatos';
import type { Validacion } from '../model/validacion';
import { useMuestraValidacion } from '../api/usePredicciones';

type Match = Validacion['matches'][number];
type NoMatch = Validacion['no_matches'][number];

/** Columnas de la tabla de coincidencias con el padrón DENUE. */
const COLUMNAS_MATCH: Column<Match>[] = [
  { key: 'google', header: 'Google', cell: (m) => <span className="font-medium">{m.nombre}</span> },
  { key: 'denue', header: 'DENUE', cell: (m) => m.nombre_denue ?? '—' },
  {
    key: 'score',
    header: 'Score',
    className: 'text-right',
    cell: (m) => <Badge tone={m.fuzzy_score >= 85 ? 'success' : 'warning'}>{m.fuzzy_score}</Badge>,
  },
  {
    key: 'dist',
    header: 'Dist.',
    className: 'text-right tabular-nums',
    cell: (m) => (m.distancia_m < 9999 ? `${m.distancia_m} m` : '—'),
  },
];

/** Columnas de la tabla de candidatos sin coincidencia (informales). */
const COLUMNAS_NOMATCH: Column<NoMatch>[] = [
  { key: 'negocio', header: 'Negocio', cell: (c) => <span className="font-medium">{c.nombre}</span> },
  { key: 'giro', header: 'Giro', cell: (c) => giroLabel(c.tipos) },
  { key: 'lat', header: 'Lat', className: 'text-right tabular-nums', cell: (c) => (c.lat ?? 0).toFixed(5) },
  { key: 'lng', header: 'Lng', className: 'text-right tabular-nums', cell: (c) => (c.lng ?? 0).toFixed(5) },
];

const POR_PAGINA = 8;

export function ValidacionPage() {
  const query = useMuestraValidacion();
  return (
    <QueryBoundary
      query={query}
      loading={
        <div className="flex h-full items-center justify-center">
          <Spinner label="Cargando muestra…" />
        </div>
      }
    >
      {(data) => (
        <Page width="wide" className="grid gap-6">
          <PageHeader
            eyebrow="Control de calidad"
            title="Validación del cruce"
            description="Muestra de negocios de Google Maps contrastados contra el padrón DENUE, para comprobar a mano que el emparejamiento funciona"
          />

          {/* Una tabla sobre la otra (coincidencias primero); cada una trae su
              propio buscador y paginación (DataTable global). */}
          <div className="grid gap-8">
            <TablaSeccion
              titulo="Coincidencias con DENUE"
              total={data.matches.length}
            >
              <DataTable
                columns={COLUMNAS_MATCH}
                rows={data.matches}
                rowKey={(m) => `${m.nombre}-${m.nombre_denue ?? ''}-${m.fuzzy_score}-${m.distancia_m}`}
                searchable={(m) => `${m.nombre} ${m.nombre_denue ?? ''}`}
                searchPlaceholder="Buscar en coincidencias…"
                empty={<EmptyState title="Sin coincidencias." className="p-8" />}
                pageSize={POR_PAGINA}
                itemLabel="coincidencias"
              />
            </TablaSeccion>

            <TablaSeccion
              titulo="Sin coincidencia (candidatos informales)"
              total={data.no_matches.length}
            >
              <DataTable
                columns={COLUMNAS_NOMATCH}
                rows={data.no_matches}
                rowKey={(c) => `${c.nombre}-${c.lat ?? ''}-${c.lng ?? ''}`}
                searchable={(c) => `${c.nombre} ${giroLabel(c.tipos)}`}
                searchPlaceholder="Buscar negocio o giro…"
                empty={<EmptyState title="Sin candidatos." className="p-8" />}
                pageSize={POR_PAGINA}
                itemLabel="candidatos"
              />
            </TablaSeccion>
          </div>
        </Page>
      )}
    </QueryBoundary>
  );
}

/** Encabezado (título + conteo) sobre una tabla de la validación. */
function TablaSeccion({
  titulo,
  total,
  children,
}: {
  titulo: string;
  total: number;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-2">
      <h2 className="font-display font-bold">
        {titulo}{' '}
        <span className="text-xs font-normal text-fg-muted">{formatNumero(total)} registros</span>
      </h2>
      {children}
    </section>
  );
}
