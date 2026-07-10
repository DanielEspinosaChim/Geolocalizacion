import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import { SearchInput } from './SearchInput';
import { Skeleton } from './Skeleton';
import { Table, TBody, Td, Th, THead, Tr } from './Table';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Clases extra para <th> y <td> de esta columna (ej. ancho, alineación). */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Muestra filas skeleton mientras carga. */
  loading?: boolean;
  /** Contenido cuando no hay filas (default: EmptyState genérico). */
  empty?: ReactNode;
  /** Clases por fila según su dato (ej. atenuar filas deshabilitadas). */
  rowClassName?: (row: T) => string;
  skeletonRows?: number;
  /**
   * Activa el buscador. Devuelve el texto de la fila donde se busca; el filtro
   * es «contiene», sin acentos ni mayúsculas.
   */
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  /** Controles extra a la derecha del buscador (ej. un filtro por rol). */
  toolbar?: ReactNode;
  /** Activa la paginación numerada con este número de filas por página. */
  pageSize?: number;
  /** Nombre de lo que se lista, para el pie: «… de 25 usuarios». */
  itemLabel?: string;
}

/** Minúsculas y sin acentos, para que «Peón» encuentre «peon». */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Filtra las filas por el texto buscado; sin buscador devuelve `rows` intacto. */
function useFiltrado<T>(rows: T[], searchable: ((row: T) => string) | undefined, busqueda: string) {
  return useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!searchable || !q) return rows;
    return rows.filter((r) => normalizar(searchable(r)).includes(q));
  }, [rows, searchable, busqueda]);
}

/** Recorta las filas a la página actual. Sin `pageSize` las devuelve todas. */
function paginar<T>(filas: T[], pagina: number, pageSize: number | undefined) {
  if (!pageSize) return { totalPages: 1, desde: 0, visibles: filas };
  const totalPages = Math.max(1, Math.ceil(filas.length / pageSize));
  const desde = (pagina - 1) * pageSize;
  return { totalPages, desde, visibles: filas.slice(desde, desde + pageSize) };
}

/**
 * Tabla de datos declarativa sobre los primitivos <Table>. Todo vive dentro de
 * la misma tarjeta: buscador y filtros arriba, tabla en medio, resumen y
 * paginación en el pie. Integra los estados de carga (skeleton) y vacío.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  rowClassName,
  skeletonRows = 4,
  searchable,
  searchPlaceholder = 'Buscar…',
  toolbar,
  pageSize,
  itemLabel = 'resultados',
}: DataTableProps<T>) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  const filtradas = useFiltrado(rows, searchable, busqueda);
  const { totalPages, desde, visibles } = paginar(filtradas, pagina, pageSize);

  // Al filtrar, la página actual puede quedar fuera de rango.
  useEffect(() => setPagina((p) => Math.min(p, totalPages)), [totalPages]);

  const vacia = !loading && filtradas.length === 0;
  const mostrarPie = Boolean(pageSize) && !loading && !vacia;

  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface">
      <Barra
        searchable={Boolean(searchable)}
        busqueda={busqueda}
        placeholder={searchPlaceholder}
        toolbar={toolbar}
        onBuscar={(v) => {
          setBusqueda(v);
          setPagina(1);
        }}
      />

      {vacia ? (
        <Vacio busqueda={busqueda} empty={empty} />
      ) : (
        <Cuerpo
          columns={columns}
          rows={visibles}
          rowKey={rowKey}
          loading={loading}
          rowClassName={rowClassName}
          skeletonRows={skeletonRows}
        />
      )}

      {mostrarPie ? (
        <div className="border-t border-border p-3">
          <Pagination
            page={pagina}
            totalPages={totalPages}
            onChange={setPagina}
            summary={`Mostrando ${desde + 1} a ${desde + visibles.length} de ${filtradas.length} ${itemLabel}`}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Cabecera de la tarjeta: buscador a la izquierda, filtros a la derecha. */
function Barra({
  searchable,
  busqueda,
  placeholder,
  toolbar,
  onBuscar,
}: {
  searchable: boolean;
  busqueda: string;
  placeholder: string;
  toolbar: ReactNode;
  onBuscar: (v: string) => void;
}): ReactNode {
  if (!searchable && !toolbar) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
      {searchable ? (
        <div className="min-w-52 flex-1">
          <SearchInput
            value={busqueda}
            onChange={onBuscar}
            debounceMs={150}
            placeholder={placeholder}
            aria-label={placeholder}
          />
        </div>
      ) : null}
      {toolbar}
    </div>
  );
}

function Vacio({ busqueda, empty }: { busqueda: string; empty?: ReactNode }): ReactNode {
  if (busqueda) return <EmptyState className="p-8" title={`Sin resultados para «${busqueda}».`} />;
  return empty ?? <EmptyState className="p-8" title="Sin datos." />;
}

function Cuerpo<T>({
  columns,
  rows,
  rowKey,
  loading,
  rowClassName,
  skeletonRows,
}: Required<Pick<DataTableProps<T>, 'columns' | 'rows' | 'rowKey' | 'loading' | 'skeletonRows'>> &
  Pick<DataTableProps<T>, 'rowClassName'>) {
  const filas = loading ? Array.from({ length: skeletonRows }, (_, i) => ({ __skeleton: i })) : rows;

  return (
    <Table framed={false}>
      <THead>
        <Tr>
          {columns.map((c) => (
            <Th key={c.key} className={c.className}>
              {c.header}
            </Th>
          ))}
        </Tr>
      </THead>
      <TBody>
        {filas.map((row, i) => (
          <Tr
            key={loading ? i : rowKey(row as T)}
            className={loading ? '' : rowClassName?.(row as T)}
          >
            {columns.map((c) => (
              <Td key={c.key} className={c.className}>
                {loading ? <Skeleton className="h-4 w-full" /> : c.cell(row as T)}
              </Td>
            ))}
          </Tr>
        ))}
      </TBody>
    </Table>
  );
}
